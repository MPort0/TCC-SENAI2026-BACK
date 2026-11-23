"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const iaSimulacao_1 = require("../../iaSimulacao");
const router = express_1.default.Router();
// Como o prefixo "/ia" já está no server.ts, aqui você deixa apenas "/simulacao"
router.post('/simulacao', async (req, res) => {
    try {
        const { mensagem, historico, config } = req.body;
        const resultado = await (0, iaSimulacao_1.gerarRespostaSimulacao)(mensagem, historico, config);
        res.json(resultado);
    }
    catch (error) {
        console.error("Erro na rota de simulação:", error);
        res.status(500).json({ error: error.message || "Erro interno no servidor." });
    }
});
exports.default = router;
