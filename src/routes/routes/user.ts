import { Router, Response, Request } from "express";
import bcrypt from "bcrypt";
import prisma from "../../prismaClient";

const router = Router();

// Cadastrar usuário
// Cadastrar usuário
router.post("/cadastro", async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios: email, password, name' });
    }

    if (typeof password !== 'string' || password.length <= 7) {
        return res.status(400).json({ error: 'A senha deve ter ao menos 8 caracteres' });
    }

    try {
        const usuarioExistente = await prisma.user.findUnique({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: passwordHash,
                name
            }
        });

        return res.status(201).json({ message: 'Usuário criado com sucesso', user });
    } catch (error: any) {
        console.error('Erro detalhado ao cadastrar:', error);
        return res.status(500).json({
            error: 'Erro interno ao cadastrar usuário',
            detalhe: error?.message || String(error)
        });
    }
});

// Login do usuário
router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }

        const senhaCorreta = await bcrypt.compare(password, user.password);
        if (!senhaCorreta) {
            return res.status(401).json({ error: 'Email ou senha incorretos' });
        }

        return res.json({
            message: 'Login realizado com sucesso',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                foto: user.foto || null
            },
        });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro interno ao fazer login' });
    }
});

// Redefinir senha
router.post("/redefinir", async (req: Request, res: Response) => {
    try {
        const { email, password, confirmPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!email || !password || !confirmPassword) {
            return res.status(400).json({ error: "Preencha todos os campos!" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "As senhas não coincidem" });
        }

        if (!user) {
            return res.status(404).json({ error: "Email não encontrado!" });
        }

        const novaPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { email },
            data: { password: novaPassword }
        });

        return res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
        return res.status(400).json({ error: "Erro interno no servidor" });
    }
});

// Listar usuários
router.get("/users", async (req: Request, res: Response) => {
    try {
        const usuarios = await prisma.user.findMany({
            select: { id: true, name: true, email: true, foto: true }
        });
        return res.json({ usuarios });
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return res.status(500).json({ error: 'Erro interno ao buscar usuários' });
    }
});

// Buscar dados e foto de um usuário específico
router.get("/users/:id", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
        const usuario = await prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, foto: true }
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        return res.json(usuario);
    } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        return res.status(500).json({ error: "Erro ao buscar usuário" });
    }
});

// Atualizar foto de perfil diretamente no banco
router.put("/users/:id/foto", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { foto } = req.body;

    if (!foto) {
        return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }

    try {
        const atualizado = await prisma.user.update({
            where: { id },
            data: { foto },
            select: { id: true, name: true, email: true, foto: true }
        });
        return res.json(atualizado);
    } catch (error) {
        console.error("Erro ao salvar foto:", error);
        return res.status(500).json({ error: "Erro ao salvar foto no banco." });
    }
});

export default router;