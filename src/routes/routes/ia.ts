// src/routes/routes/ia.ts
import { Router, Request, Response } from 'express';
import { gerarRespostaIA } from '../../iaChat';
import { conduzirConversaCurriculo } from '../../novoCurriculo';

const iaRouter = Router();

iaRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mensagem, historico } = req.body;

    if (!mensagem || typeof mensagem !== 'string') {
      res.status(400).json({ error: "" });
      return;
    }

    const resultado = await gerarRespostaIA(mensagem, historico);

    res.json({
      resposta: resultado.texto,
      modelo: resultado.modelo,
      historico: resultado.historicoAtualizado
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message || "Erro interno no servidor." });
  }
});

iaRouter.post('/curriculo-conversa', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mensagem, dadosAtuais, historico, modoEdicao } = req.body;

    if (!mensagem || typeof mensagem !== 'string') {
      res.status(400).json({ error: "Mensagem inválida." });
      return;
    }

    const resultado = await conduzirConversaCurriculo(
      mensagem,
      dadosAtuais,
      historico || [],
      Boolean(modoEdicao)
    );
    res.json(resultado);
  } catch (error: any) {
    res.status(500).json({ erro: error.message || "Erro interno ao conduzir currículo." });
  }
});

export default iaRouter;