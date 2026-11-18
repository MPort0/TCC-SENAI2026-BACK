import { Router, Response, Request } from "express";
import prisma from "../../prismaClient";
const router = Router();

// Atualizar nome e e-mail do usuário
router.put("/perfil/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
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

// ==========================================
// NOVAS ROTAS DE CURRÍCULO NO PRISMA
// ==========================================

// 1. Salvar um novo currículo no banco
router.post("/curriculos", async (req: Request, res: Response) => {
    const { userId, nome, cargo, contato, resumo, experiencia, formacao, habilidades } = req.body;

    if (!userId || !nome) {
        return res.status(400).json({ error: "userId e nome são obrigatórios." });
    }

    try {
        const novoCurriculo = await prisma.curriculo.create({
            data: {
                userId: Number(userId),
                nome,
                cargo: cargo || "",
                contato: contato || "",
                resumo: resumo || "",
                experiencia: experiencia || "",
                formacao: formacao || "",
                habilidades: JSON.stringify(Array.isArray(habilidades) ? habilidades : [])
            }
        });

        return res.status(201).json({
            ...novoCurriculo,
            habilidades: JSON.parse(novoCurriculo.habilidades)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao salvar currículo no banco." });
    }
});

// 2. Listar todos os currículos de um usuário
router.get("/curriculos/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const lista = await prisma.curriculo.findMany({
            where: { userId: Number(userId) },
            orderBy: { criadoEm: "desc" }
        });

        const curriculosFormatados = lista.map((cv) => ({
            ...cv,
            habilidades: cv.habilidades ? JSON.parse(cv.habilidades) : []
        }));

        return res.json(curriculosFormatados);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao buscar currículos." });
    }
});

// 3. Atualizar um currículo existente
router.put("/curriculos/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nome, cargo, contato, resumo, experiencia, formacao, habilidades } = req.body;

    try {
        const atualizado = await prisma.curriculo.update({
            where: { id: Number(id) },
            data: {
                nome,
                cargo: cargo || "",
                contato: contato || "",
                resumo: resumo || "",
                experiencia: experiencia || "",
                formacao: formacao || "",
                habilidades: JSON.stringify(Array.isArray(habilidades) ? habilidades : [])
            }
        });

        return res.json({
            ...atualizado,
            habilidades: JSON.parse(atualizado.habilidades)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao atualizar currículo." });
    }
});

// 4. Apagar um currículo pelo ID
router.delete("/curriculos/:id", async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        await prisma.curriculo.delete({
            where: { id: Number(id) }
        });

        return res.json({ message: "Currículo excluído com sucesso!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao excluir currículo." });
    }
});

export default router;