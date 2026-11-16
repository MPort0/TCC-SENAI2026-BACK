// src/novoCurriculo.ts
import { gerarRespostaIA } from './iaChat';
import router from './routes/routes/user';

export interface RespostaCurriculoIA {
    resumoOtimizado: string;
    topicosExperiencia: string[];
}

export interface DadosCurriculo {
    nome: string;
    cargo: string;
    contato: string;
    resumo: string;
    experiencia: string;
    formacao: string;
    habilidades: string[];
}

export interface RespostaConversaCurriculo {
    respostaBot: string;
    dadosAtualizados: DadosCurriculo;
    concluido: boolean;
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

    const resultado = await gerarRespostaIA(prompt, []);

    try {
        const textoLimpo = resultado.texto.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonParsed = JSON.parse(textoLimpo);

        return {
            resumoOtimizado: jsonParsed.resumoOtimizado || textoBruto,
            topicosExperiencia: jsonParsed.topicosExperiencia || []
        };
    } catch (error) {
        console.error("Erro ao converter resposta da IA do currículo para JSON:", error);
        return {
            resumoOtimizado: resultado.texto,
            topicosExperiencia: [textoBruto]
        };
    }
}

export async function conduzirConversaCurriculo(
    ultimaMensagem: string,
    dadosAtuais: DadosCurriculo,
    historico: any[] = [],
    modoEdicao: boolean = false
): Promise<RespostaConversaCurriculo> {
    const instrucaoModo = modoEdicao
        ? `MODO EDIÇÃO ATIVO:
O candidato já possui um currículo pronto (mostrado nos dados abaixo) e quer editar apenas o que desejar.
- Se ele pedir para alterar algum campo (ex: mudar cargo, melhorar resumo, adicionar/remover habilidade, corrigir experiência, formação, contato ou nome), aplique a alteração mantendo todo o restante intacto e pergunte: "Pronto, atualizei! Deseja editar mais alguma informação ou podemos finalizar?" com "concluido": false.
- Se ele disser que não quer editar mais nada (ex: "não", "só isso", "pode salvar", "tá ótimo", "finalizar"), defina "concluido": true e responda: "Perfeito! Suas alterações foram salvas com sucesso no seu <strong>Perfil</strong>."`
        : `MODO CRIAÇÃO ATIVO:
Sua missão é entrevistar o candidato de forma natural, amigável e objetiva para preencher TODOS os 7 campos do currículo dele.
- Assim que souber o cargo e um pouco sobre ele, já gere ou atualize o campo "resumo" automaticamente com um texto profissional.
- Verifique se ainda falta preencher algum dos 7 campos.
- Se ainda faltar algum campo, faça APENAS UMA pergunta direta e natural para coletar o próximo dado que falta e defina "concluido": false.
- Quando TODOS os 7 campos estiverem bem preenchidos, defina "concluido": true e escreva uma mensagem final parabenizando e avisando que o currículo está pronto e salvo no Perfil.`;

    const prompt = `Você é a Ava.Lia, especialista em RH e criação de currículos.
Os 7 campos do currículo são:
1. "nome": Nome completo
2. "cargo": Cargo ou área desejada
3. "contato": E-mail, telefone e cidade
4. "resumo": Resumo profissional
5. "experiencia": Experiências profissionais formatadas em tópicos claros com verbos de ação (ou "Em busca da primeira oportunidade" se ele não tiver experiência)
6. "formacao": Curso, instituição e ano/status
7. "habilidades": Lista (array de strings) com habilidades técnicas e comportamentais

${instrucaoModo}

Dados atuais do currículo:
${JSON.stringify(dadosAtuais, null, 2)}

Histórico recente da conversa:
${JSON.stringify(historico.slice(-6), null, 2)}

Última mensagem do candidato:
"${ultimaMensagem}"

REGRAS ESTRITAS:
1. Extraia as informações da última resposta do candidato e atualize os campos correspondentes em "dadosAtualizados" (mantendo tudo que já estava preenchido antes).
2. Sempre que o candidato descrever experiências ou objetivos de forma informal, transforme em texto profissional e impactante nos "dadosAtualizados".
3. Caso a resposta do usuário não seja correspondente com o contexto ou pergunta, não aceite a resposta. Peça educadamente para que o usuário(a) responda de forma pertinente.
4. Responda EXCLUSIVAMENTE em JSON estrito, sem crases de markdown e sem texto fora do JSON:
{
  "respostaBot": "Texto da sua próxima pergunta ou mensagem final (pode usar <strong> para destacar termos)",
  "dadosAtualizados": {
    "nome": "",
    "cargo": "",
    "contato": "",
    "resumo": "",
    "experiencia": "",
    "formacao": "",
    "habilidades": []
  },
  "concluido": false
}`;

    const resultado = await gerarRespostaIA(prompt, []);

    try {
        const textoLimpo = resultado.texto.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonParsed = JSON.parse(textoLimpo);

        return {
            respostaBot: jsonParsed.respostaBot || "Pode me contar um pouco mais para continuarmos o seu currículo?",
            dadosAtualizados: {
                nome: jsonParsed.dadosAtualizados?.nome || dadosAtuais.nome || "",
                cargo: jsonParsed.dadosAtualizados?.cargo || dadosAtuais.cargo || "",
                contato: jsonParsed.dadosAtualizados?.contato || dadosAtuais.contato || "",
                resumo: jsonParsed.dadosAtualizados?.resumo || dadosAtuais.resumo || "",
                experiencia: jsonParsed.dadosAtualizados?.experiencia || dadosAtuais.experiencia || "",
                formacao: jsonParsed.dadosAtualizados?.formacao || dadosAtuais.formacao || "",
                habilidades: Array.isArray(jsonParsed.dadosAtualizados?.habilidades)
                    ? jsonParsed.dadosAtualizados.habilidades
                    : (dadosAtuais.habilidades || [])
            },
            concluido: Boolean(jsonParsed.concluido)
        };
    } catch (error) {
        console.error("Erro ao converter conversa de currículo para JSON:", error);
        return {
            respostaBot: resultado.texto,
            dadosAtualizados: dadosAtuais,
            concluido: false
        };
    }
}

export default router;