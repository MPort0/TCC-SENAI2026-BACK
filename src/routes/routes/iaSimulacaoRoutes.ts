import express from 'express';
import prisma from "../../prismaClient";
import { gerarRespostaSimulacao } from '../../iaSimulacao';

const router = express.Router();

// simulacao de entrevista
router.post('/simulacao', async (req, res) => {
  try {
    const { mensagem, historico, config } = req.body;
    const resultado = await gerarRespostaSimulacao(mensagem, historico, config);
    res.json(resultado);
  } catch (error: any) {
    console.error("Erro na rota de simulação:", error);
    res.status(500).json({ error: error.message || "Erro interno no servidor." });
  }
});

// 1. Salvar devolutiva concluída no banco
router.post('/devolutivas', async (req, res) => {
  try {
    const { userId, config, relatorio } = req.body;

    if (!userId || !relatorio) {
      return res.status(400).json({ error: "Dados incompletos para salvar devolutiva." });
    }

    const percFund = Number(relatorio.competencias?.fundamentais?.porcentagem || 0);
    const percPrat = Number(relatorio.competencias?.pratica?.porcentagem || 0);
    // Calcula a nota de 0 a 10 baseada na média das porcentagens (ou usa relatorio.nota se existir)
    const notaCalculada = relatorio.nota !== undefined
      ? Number(relatorio.nota)
      : Number((((percFund + percPrat) / 2) / 10).toFixed(1));

    const novaDevolutiva = await prisma.devolutiva.create({
      data: {
        userId: Number(userId),
        cargo: config?.cargo || "Entrevista Técnica",
        tecnologia: config?.tecnologia || "Geral",
        dificuldade: config?.dificuldade || "Médio",
        nota: notaCalculada,
        resumo: relatorio.resumo || "",
        fundamentaisNivel: relatorio.competencias?.fundamentais?.nivel || "Avaliado",
        fundamentaisPorcentagem: percFund,
        praticaNivel: relatorio.competencias?.pratica?.nivel || "Avaliado",
        praticaPorcentagem: percPrat,
        pontosFortes: JSON.stringify(relatorio.pontosFortes || []),
        principaisErros: JSON.stringify(relatorio.principaisErros || []),
        sugestoesEstudo: JSON.stringify(relatorio.sugestoesEstudo || []),
      }
    });

    res.status(201).json(novaDevolutiva);
  } catch (error: any) {
    console.error("Erro ao salvar devolutiva:", error);
    res.status(500).json({ error: "Erro ao salvar devolutiva no banco." });
  }
});

// 2. Listar histórico de devolutivas de um usuário
router.get('/devolutivas/usuario/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const lista = await prisma.devolutiva.findMany({
      where: { userId },
      orderBy: { criadoEm: 'desc' }
    });
    res.json(lista);
  } catch (error) {
    console.error("Erro ao listar histórico:", error);
    res.status(500).json({ error: "Erro ao buscar histórico." });
  }
});

// 3. Buscar uma devolutiva específica pelo ID (ao clicar na seta do Histórico)
router.get('/devolutivas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.devolutiva.findUnique({ where: { id } });

    if (!item) return res.status(404).json({ error: "Devolutiva não encontrada." });

    // Reconstrói exatamente o formato que o seu devolutiva.js já espera
    res.json({
      resumo: item.resumo,
      competencias: {
        fundamentais: {
          nivel: item.fundamentaisNivel,
          porcentagem: item.fundamentaisPorcentagem
        },
        pratica: {
          nivel: item.praticaNivel,
          porcentagem: item.praticaPorcentagem
        }
      },
      pontosFortes: JSON.parse(item.pontosFortes),
      principaisErros: JSON.parse(item.principaisErros),
      sugestoesEstudo: JSON.parse(item.sugestoesEstudo)
    });
  } catch (error) {
    console.error("Erro ao buscar devolutiva:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes da devolutiva." });
  }
});

export default router;