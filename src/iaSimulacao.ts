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
    totalPerguntas?: number;
}

export interface RelatorioDevolutiva {
    resumo: string;
    competencias: {
        fundamentais: { nivel: string; porcentagem: number };
        pratica: { nivel: string; porcentagem: number };
    };
    pontosFortes: string[];
    principaisErros: string[];
    sugestoesEstudo: string[];
}

export interface ResultadoSimulacao {
    texto: string;
    respostaValida: boolean;
    concluida: boolean;
    relatorio?: RelatorioDevolutiva;
    modelo: string;
    historicoAtualizado: Content[];
}

function gerarInstrucaoSimulacao(config?: EntrevistaConfig, passoAtual: number = 1): string {
    const cargo = config?.cargo || "Desenvolvedor";
    const tecnologia = config?.tecnologia || "Tecnologia Geral";
    const dificuldade = config?.dificuldade || "Júnior";

    const totalPerguntas = config?.totalPerguntas || 5;
    const ehUltimaPergunta = passoAtual >= totalPerguntas;

    return `Você é a Ava.Lia, recrutadora e entrevistadora técnica do sistema Avalia.
Sua missão é conduzir uma simulação de entrevista técnica realista.

Configurações da Entrevista:
- Cargo Alvo: ${cargo}
- Tecnologia Foco: ${tecnologia}
- Nível de Dificuldade: ${dificuldade}
- Passo Atual: ${passoAtual} de ${totalPerguntas}

REGRAS OBRIGATÓRIAS DE RESPOSTA (JSON):
1. Responda ESTRITAMENTE em formato JSON com a seguinte estrutura:
   {
     "respostaValida": true ou false,
     "concluida": ${ehUltimaPergunta ? "true" : "false"},
     "texto": "Sua resposta completa para o candidato...",
     "relatorio": ${ehUltimaPergunta ? "objeto JSON de avaliação final" : "null"}
   }

2. Regras para "respostaValida":
   - Se a mensagem do usuário for "INICIAR_ENTREVISTA": marque "respostaValida": false (abertura da conversa).
   - Se o candidato TENTOU responder OU disse que NÃO SABE / NÃO LEMBRA (ex: "não sei", "passo", "não lembro"): marque "respostaValida": true.
   - Marque "respostaValida": false APENAS para desvios completos de assunto (ex: "oi", "tudo bem?", testes de texto sem relação com a entrevista).

3. Regras para o campo "texto":
   - Se "respostaValida" = false: Peça educadamente para focar na entrevista e repita a pergunta anterior.
   - Se "respostaValida" = true E AINDA NÃO É O ÚLTIMO PASSO (passo < ${totalPerguntas}): Dê um breve feedback/explicação sobre a resposta dada e faça a PRÓXIMA pergunta técnica sobre ${tecnologia}.
   - Se "respostaValida" = true E É O ÚLTIMO PASSO (passo >= ${totalPerguntas}): Dê um breve feedback da resposta dada, encerre a entrevista de forma amigável parabenizando o candidato e avise que o relatório final está pronto. NÃO FAÇA NOVAS PERGUNTAS!

4. Regras para o campo "relatorio" (OBRIGATÓRIO quando "concluida" = true):
   Construa um relatório profundo baseado em todo o histórico de respostas do candidato contendo exatamente esta estrutura:
   {
     "resumo": "Texto corrido detalhado analisando a performance geral do candidato para o topo da página de devolutiva.",
     "competencias": {
       "fundamentais": { "nivel": "Bom", "porcentagem": 75 },
       "pratica": { "nivel": "Regular", "porcentagem": 50 }
     },
     "pontosFortes": ["Item 1", "Item 2"],
     "principaisErros": ["Item 1", "Item 2"],
     "sugestoesEstudo": ["Item 1", "Item 2"]
   }`;
}

function extrairJson(respostaIA: string): { texto: string; respostaValida: boolean; concluida: boolean; relatorio?: RelatorioDevolutiva } {
    try {
        const limpo = respostaIA.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(limpo);
        return {
            texto: parsed.texto || respostaIA,
            respostaValida: Boolean(parsed.respostaValida),
            concluida: Boolean(parsed.concluida),
            relatorio: parsed.relatorio || undefined
        };
    } catch {
        return {
            texto: respostaIA,
            respostaValida: false,
            concluida: false
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
    config?: EntrevistaConfig,
    passoAtual: number = 1
): Promise<ResultadoSimulacao> {

    const instrucaoSistema = gerarInstrucaoSimulacao(config, passoAtual);

    // 1. TENTATIVA PRINCIPAL: gemini-3.8-flash
    try {
        console.log(`Chamando simulação em cascata: gemini-3.8-flash (Passo ${passoAtual})...`);

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
        const { texto, respostaValida, concluida, relatorio } = extrairJson(response.text || '');

        return {
            texto,
            respostaValida,
            concluida,
            relatorio,
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
            const { texto: textoLlama, respostaValida: respostaValidaLlama, concluida: concluidaLlama, relatorio: relatorioLlama } = extrairJson(rawContent);

            const historicoAtualizadoLlama = adicionarAoHistoricoGemini(historicoAnterior, mensagemUsuario, textoLlama);

            return {
                texto: textoLlama,
                respostaValida: respostaValidaLlama,
                concluida: concluidaLlama,
                relatorio: relatorioLlama,
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
                const { texto: textoFb, respostaValida: respostaValidaFb, concluida: concluidaFb, relatorio: relatorioFb } = extrairJson(responseFallback.text || '');

                return {
                    texto: textoFb,
                    respostaValida: respostaValidaFb,
                    concluida: concluidaFb,
                    relatorio: relatorioFb,
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