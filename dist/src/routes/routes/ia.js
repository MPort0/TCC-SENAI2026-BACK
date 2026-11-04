"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/routes/ia.ts
const express_1 = require("express");
const iaChat_1 = require("../../iaChat");
const iaRouter = (0, express_1.Router)();
iaRouter.post('/', async (req, res) => {
    try {
        // Agora o corpo da requisição aceita a mensagem e o array do histórico
        const { mensagem, historico } = req.body;
        if (!mensagem || typeof mensagem !== 'string') {
            res.status(400).json({ error: "" });
            return;
        }
        // Passa o histórico (se não for enviado pelo front, ele inicia como um array vazio [])
        const resultado = await (0, iaChat_1.gerarRespostaIA)(mensagem, historico);
        // Devolve o texto, o modelo ativo E o histórico atualizado para o Front-end guardar
        res.json({
            resposta: resultado.texto,
            modelo: resultado.modelo,
            historico: resultado.historicoAtualizado
        });
    }
    catch (error) {
        res.status(500).json({ erro: error.message || "Erro interno no servidor." });
    }
});
exports.default = iaRouter;
