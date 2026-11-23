"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prismaClient_1 = __importDefault(require("../../prismaClient"));
const router = (0, express_1.Router)();
router.put("/perfil", async (req, res) => {
    // 💡 Adicionamos o 'id' aqui para saber QUEM atualizar
    const { id, name, email } = req.body;
    if (!id || !name || !email) {
        return res.status(400).json({ error: 'ID, nome e email são obrigatórios' });
    }
    try {
        const userUpdate = await prismaClient_1.default.user.update({
            where: {
                id: id
            },
            data: {
                name,
                email
            }
        });
        return res.json({ message: 'Usuário atualizado com sucesso', userUpdate });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Erro ao atualizar o perfil!"
        });
    }
});
exports.default = router;
