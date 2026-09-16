import { Router, Response, Request } from "express";
import bcrypt from "bcrypt"
import prisma from "../../prismaClient";

const router = Router()

//cadastrar usuário
router.post("/cadastro/user", async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios: email, password, name, rm, curso, telNumero' });
    }

    if (typeof password !== 'string' || password.length <= 8) {
        return res.status(400).json({ error: 'A senha deve ter mais de 8 caracteres' });
    }

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
});

//Login do usuario
router.post("/login/user", async (req: Request, res: Response) => {
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
            },
        });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ error: 'Erro interno ao fazer login' });
    }
})

export default router;