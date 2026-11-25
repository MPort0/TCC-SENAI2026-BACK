import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./prismaClient"; // <-- confirma se o caminho é ./prismaClient
import api from "./routes/routes/user";
import api2 from "./routes/routes/perfil";
import apiIA from "./routes/routes/ia";
import apiSimulacao from "./routes/routes/iaSimulacaoRoutes";
import apiCurriculo from "./novoCurriculo";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

app.use("/", api);
app.use("/", api2);
app.use("/ia", apiIA);
app.use("/ia", apiSimulacao);
app.use("/ia", apiCurriculo);

const PORT = process.env.PORT || 8080;

async function iniciarServidor() {
    try {
        // Garante que a coluna foto existe no banco SQLite sem travar o deploy
        await prisma.$executeRawUnsafe(`ALTER TABLE user ADD COLUMN foto TEXT;`);
        console.log("Coluna foto criada com sucesso!");
    } catch (e) {
        // Se a coluna já existir, o SQLite avisa e o servidor continua normalmente
        console.log("Coluna foto já verificada.");
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

iniciarServidor();

/**
 * Endpoint de comunicação com a IA
 * Acessível em: POST http://localhost:3000/ia
 */