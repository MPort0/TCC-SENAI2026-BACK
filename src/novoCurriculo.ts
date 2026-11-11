// src/iaCurriculo.ts
import { Router } from 'express';
import { gerarRespostaIA } from './iaChat';
import router from './routes/routes/user';

export interface RespostaCurriculoIA {
    resumoOtimizado: string;
    topicosExperiencia: string[];
}

export async function processarTextoCurriculo(cargo: string, textoBruto: string): Promise<RespostaCurriculoIA> {
    const prompt = `Você é a Ava.Lia, especialista em RH e otimização de currículos.
O candidato busca a vaga de: "${cargo}".
Ele descreveu a experiência dele de forma informal:
"${textoBruto}"

Sua tarefa: Transformar essa descrição em um texto formal, profissional e impactante.

REGRAS ESTRITAS:
1. Responda EXCLUSIVAMENTE em formato JSON estrito (sem markdown extra, sem explicações fora do JSON).
2. O formato de resposta deve ser exatamente:
{
  "resumoOtimizado": "Texto formal para a seção de resumo do currículo",
  "topicosExperiencia": [
    "Item 1 formatado com verbo de ação",
    "Item 2 destacando tecnologias e resultados"
  ]
}`;

    // Reutiliza toda a tua cascata de segurança (Gemini -> Groq -> Gemini Lite)
    const resultado = await gerarRespostaIA(prompt, []);

    try {
        // Limpa possíveis marcadores de markdown (```json ... ```) se a IA enviar
        const textoLimpo = resultado.texto.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonParsed = JSON.parse(textoLimpo);

        return {
            resumoOtimizado: jsonParsed.resumoOtimizado || textoBruto,
            topicosExperiencia: jsonParsed.topicosExperiencia || []
        };
    } catch (error) {
        console.error("Erro ao converter resposta da IA do currículo para JSON:", error);
        // Retorno de segurança caso a IA não retorne um JSON perfeito
        return {
            resumoOtimizado: resultado.texto,
            topicosExperiencia: [textoBruto]
        };
    }
}

export default router