import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import api from "./routes/routes/user";
import api2 from "./routes/routes/perfil";
import apiIA from "./routes/routes/ia"

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", api);
app.use("/", api2);
app.use("/ia", apiIA); 

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

/**
 * Endpoint de comunicação com a IA
 * Acessível em: POST http://localhost:3000/ia
 */