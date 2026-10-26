// src/routes/routes/ia.ts
import { Router, Request, Response } from 'express';
import { gerarRespostaIA } from '../../iaService';

const iaRouter = Router();

iaRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Agora o corpo da requisição aceita a mensagem e o array do histórico
    const { mensagem, historico } = req.body;

    if (!mensagem || typeof mensagem !== 'string') {
      res.status(400).json({ error: "" });
      return;
    }

    // Passa o histórico (se não for enviado pelo front, ele inicia como um array vazio [])
    const resultado = await gerarRespostaIA(mensagem, historico);

    // Devolve o texto, o modelo ativo E o histórico atualizado para o Front-end guardar
    res.json({ 
      resposta: resultado.texto, 
      modelo: resultado.modelo,
      historico: resultado.historicoAtualizado
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message || "Erro interno no servidor." });
  }
});

export default iaRouter;