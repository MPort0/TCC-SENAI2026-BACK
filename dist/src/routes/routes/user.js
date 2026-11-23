"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prismaClient_1 = __importDefault(require("../../prismaClient"));
const router = (0, express_1.Router)();
//cadastrar usuário
router.post("/cadastro", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios: email, password, name, rm, curso, telNumero' });
    }
    if (typeof password !== 'string' || password.length <= 7) {
        return res.status(400).json({ error: 'A senha deve ter ao menos 8 caracteres' });
    }
    const usuarioExistente = await prismaClient_1.default.user.findUnique({ where: { email } });
    if (usuarioExistente) {
        return res.status(400).json({ error: 'Email já cadastrado' });
    }
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const user = await prismaClient_1.default.user.create({
        data: {
            email,
            password: passwordHash,
            name
        }
    });
    return res.status(201).json({ message: 'Usuário criado com sucesso', user });
});
//Login do usuario
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    try {
        const user = await prismaClient_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }
        const senhaCorreta = await bcrypt_1.default.compare(password, user.password);
        if (!senhaCorreta) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }
        return res.json({
            message: 'Login realizado com sucesso',
            user: {
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro interno ao fazer login' });
    }
});
//lista usuarios
router.get("/users", async (req, res) => {
    try {
        const usuarios = await prismaClient_1.default.user.findMany();
        return res.json({ usuarios });
    }
    catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar usuários' });
    }
});
exports.default = router;
