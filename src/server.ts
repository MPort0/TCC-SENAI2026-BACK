import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import api from "./routes/routes/user";
import api2 from "./routes/routes/perfil";
import apiIA from "./routes/routes/ia";
import apiSimulacao from "./routes/routes/iaSimulacaoRoutes";
import apiCurriculo from "./novoCurriculo"

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", api);
app.use("/", api2);
app.use("/ia", apiIA); 
app.use("/ia", apiSimulacao);
app.use("/ia", apiCurriculo); 

const PORT = process.env.PORT || 8080;

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

/**
 * Endpoint de comunicação com a IA
 * Acessível em: POST http://localhost:3000/ia
 */