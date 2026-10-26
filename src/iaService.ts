// src/iaService.ts
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

/* const INSTRUCAO_SISTEMA = `
  Você é uma inteligência artificial corporativa e EXCLUSIVA do sistema Avalia.
  Seu nome é Lia e você deve tirar dúvidas do usuario e conduzi-lo para se sair melhor 
  em entrevistas de emprego e gerar currículos/resumos profissionais.
`; */

function formatarHistoricoParaGroq(historicoGemini: Content[], mensagemAtual: string) {
  const mensagens = historicoGemini.map(item => {
    const papel = item.role === 'user' ? 'user' : 'assistant';
    const texto = item.parts && item.parts[0] ? (item.parts[0] as any).text || '' : '';
    return { role: papel, content: texto };
  });

  const mensagensFiltradas = mensagens.filter(m => m.content.trim() !== '');
/*   mensagensFiltradas.unshift({ role: 'system', content: INSTRUCAO_SISTEMA }); */

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

export async function gerarRespostaIA(
  mensagemUsuario: string,
  historicoAnterior: Content[] = []
): Promise<{ texto: string, modelo: string, historicoAtualizado: Content[] }> {

  // =========================================================================================
  // 1. TENTATIVA PRINCIPAL: gemini-3.8-flash
  // =========================================================================================
  try {
    console.log("Chamando chat em cascata: gemini-3.8-flash...");

    const chat = ai.chats.create({
      model: 'gemini-3.8-flash',
      history: historicoAnterior,
/*       config: { systemInstruction: INSTRUCAO_SISTEMA } */
    });

    const response = await chat.sendMessage({ message: mensagemUsuario });
    const novoHistorico = await chat.getHistory();

    return {
      texto: response.text || "Sem resposta.",
      modelo: "gemini-3.8-flash (Principal)",
      historicoAtualizado: novoHistorico
    };

  } catch (error: any) {
    // =========================================================================================
    // 2. SEGUNDA VIA DE CONTINGÊNCIA: Llama 3.3 70B via Groq
    // =========================================================================================
    console.warn("⚠️ Modelo 3.8 falhou. Acionando Segunda Via (Llama 3.3 70B via Groq)...", error.message);

    try {
      if (!GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY não definida no .env");
      }

      const mensagensGroq = formatarHistoricoParaGroq(historicoAnterior, mensagemUsuario);

      const responseGroq = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: mensagensGroq,
          temperature: 0.7
        })
      });

      if (!responseGroq.ok) {
        const detalhe = await responseGroq.text();
        throw new Error(`Erro na API da Groq: ${responseGroq.status} - ${detalhe}`);
      }

      const dadosGroq = await responseGroq.json() as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };

      const textoLlama = dadosGroq.choices?.[0]?.message?.content || "Sem resposta.";
      const historicoAtualizadoLlama = adicionarAoHistoricoGemini(historicoAnterior, mensagemUsuario, textoLlama);

      return {
        texto: textoLlama,
        modelo: "Llama 3.3 70B (Segunda Via - Groq)",
        historicoAtualizado: historicoAtualizadoLlama
      };

    } catch (groqError: any) {
      // =========================================================================================
      // 3. FALLBACK CRÍTICO FINAL: gemini-3.5-flash-lite
      // =========================================================================================
      console.warn("⚠️ Groq/Llama 3.3 também falhou. Acionando última reserva (3.5-flash-lite)...", groqError.message);

      try {
        const chatFallback = ai.chats.create({
          model: 'gemini-3.5-flash-lite',
          history: historicoAnterior,
/*           config: { systemInstruction: INSTRUCAO_SISTEMA } */
        });

        const responseFallback = await chatFallback.sendMessage({ message: mensagemUsuario });
        const novoHistoricoFallback = await chatFallback.getHistory();

        return {
          texto: responseFallback.text || "Sem resposta.",
          modelo: "gemini-3.5-flash-lite (Fallback Final)",
          historicoAtualizado: novoHistoricoFallback
        };

      } catch (fallbackError) {
        console.error("Erro crítico em todos os modelos da cascata:", fallbackError);
        throw new Error("Sistemas da IA temporariamente indisponíveis.");
      }
    }
  }
}


// itens de treinamento da ia
/*   🚨 REGRA DE SEGURANÇA MÁXIMA (BLINDAGEM DO ESCOPO):
  - Você NUNCA deve responder a perguntas que não sejam sobre a entrevista profissional do candidato ou sobre a montagem do currículo dele.
  - Se o usuário perguntar sobre culinária, piadas ou assuntos fora do escopo, recuse educadamente focado nas regras do sistema.

  📋 ROTEIRO DE ENTREVISTA FIXO:
  Use este roteiro para guiar o candidato passo a passo na entrevista. Faça uma pergunta de cada vez com base no que ele responder:
  \${ROTEIRO_ENTREVISTA}

  📄 ROTEIRO DE GERAÇÃO DE CURRÍCULO E RESUMO:
  Quando o usuário pedir para gerar o currículo com base nas respostas dadas, organize as informações estritamente neste padrão:
  \${ROTEIRO_CURRICULO} */