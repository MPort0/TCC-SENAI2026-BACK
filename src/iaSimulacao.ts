// src/iaSimulacao.ts
import { GoogleGenAI, Content } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não definida no .env");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

export interface EntrevistaConfig {
    cargo: string;
    tecnologia: string;
    dificuldade: string;
}

export interface ResultadoSimulacao {
    texto: string;
    respostaValida: boolean;
    modelo: string;
    historicoAtualizado: Content[];
}

function gerarInstrucaoSimulacao(config?: EntrevistaConfig): string {
    const cargo = config?.cargo || "Desenvolvedor";
    const tecnologia = config?.tecnologia || "Tecnologia Geral";
    const dificuldade = config?.dificuldade || "Júnior";

    return `Você é a Lia, a assistente virtual do Avalia.
Sua missão é conduzir uma simulação de entrevista técnica realista.

Configurações da Entrevista:
- Cargo Alvo: ${cargo}
- Tecnologia Foco: ${tecnologia}
- Nível de Dificuldade: ${dificuldade}

REGRAS OBRIGATÓRIAS DE RESPOSTA:
1. Responda ESTRITAMENTE em formato JSON com as chaves:
   {
     "respostaValida": true ou false,
     "texto": "Sua resposta completa para o candidato..."
   }

2. Regra de "respostaValida":
   - Se a mensagem do usuário for "INICIAR_ENTREVISTA": marque "respostaValida": false (pois é apenas a abertura).
   - Se o candidato TENTOU responder à pergunta técnica anterior (seja a resposta correta, parcial ou errada): marque "respostaValida": true.
   - Se o candidato enviou testes, cumprimentos, desvios de assunto, "não sei" ou mensagens irrelevantes: marque "respostaValida": false.
   - Se o candidato TENTOU responder OU disse que NÃO SABE / NÃO LEMBRA (ex: "não sei", "não me recordo", "passo", "não faço ideia", "pula essa"): marque "respostaValida": TRUE. Afinal, responder que não sabe encerra o ciclo dessa pergunta.

3. No campo "texto":
   - Se "respostaValida": true -> Dê um breve feedback sobre a resposta dada e faça a PRÓXIMA pergunta técnica sobre ${tecnologia}.
   - Se "respostaValida": false -> Se for o início, apresente-se e faça a primeira pergunta. Caso seja um desvio, peça educadamente para focar na questão e repita a pergunta anterior.`;
}

function extrairJson(respostaIA: string): { texto: string; respostaValida: boolean } {
    try {
        const limpo = respostaIA.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(limpo);
        return {
            texto: parsed.texto || respostaIA,
            respostaValida: Boolean(parsed.respostaValida)
        };
    } catch {
        return {
            texto: respostaIA,
            respostaValida: false
        };
    }
}

function formatarHistoricoParaGroq(historicoGemini: Content[], mensagemAtual: string, instrucaoSistema: string) {
    const mensagens = historicoGemini.map(item => {
        const papel = item.role === 'user' ? 'user' : 'assistant';
        const texto = item.parts && item.parts[0] ? (item.parts[0] as any).text || '' : '';
        return { role: papel, content: texto };
    });

    const mensagensFiltradas = mensagens.filter(m => m.content.trim() !== '');

    mensagensFiltradas.unshift({ role: 'system', content: instrucaoSistema });
    mensagensFiltradas.push({ role: 'user', content: mensagemAtual });

    return mensagensFiltradas;
}

function adicionarAoHistoricoGemini(historicoAnterior: Content[], usuario: string, ia: string): Content[] {
    return [
        ...historicoAnterior,
        { role: 'user', parts: [{ text: usuario }] } as Content,
        { role: 'model', parts: [{ text: ia }] } as Content
    ];
}

export async function gerarRespostaSimulacao(
    mensagemUsuario: string,
    historicoAnterior: Content[] = [],
    config?: EntrevistaConfig
): Promise<ResultadoSimulacao> {

    const instrucaoSistema = gerarInstrucaoSimulacao(config);

    // 1. TENTATIVA PRINCIPAL: gemini-3.8-flash
    try {
        console.log("Chamando simulação em cascata: gemini-3.8-flash...");

        const chat = ai.chats.create({
            model: 'gemini-3.8-flash',
            history: historicoAnterior,
            config: {
                systemInstruction: instrucaoSistema,
                responseMimeType: "application/json"
            }
        });

        const response = await chat.sendMessage({ message: mensagemUsuario });
        const novoHistorico = await chat.getHistory();
        const { texto, respostaValida } = extrairJson(response.text || '');

        return {
            texto,
            respostaValida,
            modelo: "gemini-3.8-flash (Principal)",
            historicoAtualizado: novoHistorico
        };

    } catch (error: any) {
        // 2. SEGUNDA VIA DE CONTINGÊNCIA: Groq
        console.warn("⚠️ Modelo 3.8 falhou na simulação. Acionando Segunda Via (Groq)...", error.message);

        try {
            if (!GROQ_API_KEY) {
                throw new Error("GROQ_API_KEY não definida no .env");
            }

            const mensagensGroq = formatarHistoricoParaGroq(historicoAnterior, mensagemUsuario, instrucaoSistema);

            const responseGroq = await fetch(GROQ_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: GROQ_MODEL,
                    messages: mensagensGroq,
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                })
            });

            if (!responseGroq.ok) {
                const detalhe = await responseGroq.text();
                throw new Error(`Erro na API da Groq: ${responseGroq.status} ${detalhe}`);
            }

            const dadosGroq = await responseGroq.json() as {
                choices?: Array<{ message?: { content?: string | null } }>;
            };

            const rawContent = dadosGroq.choices?.[0]?.message?.content || "{}";
            const { texto: textoLlama, respostaValida: respostaValidaLlama } = extrairJson(rawContent);

            const historicoAtualizadoLlama = adicionarAoHistoricoGemini(historicoAnterior, mensagemUsuario, textoLlama);

            return {
                texto: textoLlama,
                respostaValida: respostaValidaLlama,
                modelo: "Groq (Segunda Via)",
                historicoAtualizado: historicoAtualizadoLlama
            };

        } catch (groqError: any) {
            // 3. FALLBACK CRÍTICO FINAL: gemini-3.5-flash-lite
            console.warn("⚠️ Groq também falhou na simulação. Acionando última reserva (3.5-flash-lite)...", groqError.message);

            try {
                const chatFallback = ai.chats.create({
                    model: 'gemini-3.5-flash-lite',
                    history: historicoAnterior,
                    config: {
                        systemInstruction: instrucaoSistema,
                        responseMimeType: "application/json"
                    }
                });

                const responseFallback = await chatFallback.sendMessage({ message: mensagemUsuario });
                const novoHistoricoFallback = await chatFallback.getHistory();
                const { texto: textoFb, respostaValida: respostaValidaFb } = extrairJson(responseFallback.text || '');

                return {
                    texto: textoFb,
                    respostaValida: respostaValidaFb,
                    modelo: "gemini-3.5-flash-lite (Fallback Final)",
                    historicoAtualizado: novoHistoricoFallback
                };

            } catch (fallbackError) {
                console.error("Erro crítico em todos os modelos da cascata na simulação:", fallbackError);
                throw new Error("Sistemas da IA temporariamente indisponíveis.");
            }
        }
    }
}