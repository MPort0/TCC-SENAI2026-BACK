/* import { Router, Response, Request } from "express";
import prisma from "../../prismaClient";
const router = Router()

router.put("/perfil", async (req: Request, res: Response) => {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'nome e email são obrigatórios' });
        }

        try {
            const user = await prisma.user.update({

            })

            return res.json({ message: 'Usuário atualizado com sucesso', user });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            return res.status(500).json({ error: 'Não foi possível atualizar o usuário.' });
        }
    });

export default router; */