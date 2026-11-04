import express from 'express';
import { gerarRespostaSimulacao } from '../../iaSimulacao';

const router = express.Router();

// Como o prefixo "/ia" já está no server.ts, aqui você deixa apenas "/simulacao"
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

export default router;