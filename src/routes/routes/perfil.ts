import { Router, Response, Request } from "express";
import prisma from "../../prismaClient";
const router = Router();

router.put("/perfil/:id", async (req: Request, res: Response) => {
    const { id } = req.params
    const { name, email } = req.body;

    if (!id || !name || !email) {
        return res.status(400).json({ error: 'ID, nome e email são obrigatórios' });
    }

    try {
        const userUpdate = await prisma.user.update({
            where: {
                id: Number(id)
            },
            data: {
                name,
                email
            }
        });

        const { password, ...usuarioSemSenha } = userUpdate as any;

        return res.json({
            message: "Usuário atualizado com sucesso",
            user: usuarioSemSenha
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Erro ao atualizar o perfil!"
        });
    }
});

export default router;