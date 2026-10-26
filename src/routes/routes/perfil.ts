import { Router, Response, Request } from "express";
import prisma from "../../prismaClient";
const router = Router();

router.put("/perfil", async (req: Request, res: Response) => {
    // 💡 Adicionamos o 'id' aqui para saber QUEM atualizar
    const { id, name, email } = req.body;

    if (!id || !name || !email) {
        return res.status(400).json({ error: 'ID, nome e email são obrigatórios' });
    }

    try {
        const userUpdate = await prisma.user.update({
            where: {
                id: id 
            },
            data: {
                name,
                email
            }
        });

        return res.json({ message: 'Usuário atualizado com sucesso', userUpdate });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Erro ao atualizar o perfil!"
        });
    }
});

export default router;