"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_1 = __importDefault(require("./routes/routes/user"));
const perfil_1 = __importDefault(require("./routes/routes/perfil"));
const ia_1 = __importDefault(require("./routes/routes/ia"));
const iaSimulacaoRoutes_1 = __importDefault(require("./routes/routes/iaSimulacaoRoutes")); // 1. Importa a nova rota
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/", user_1.default);
app.use("/", perfil_1.default);
app.use("/ia", ia_1.default);
app.use("/ia", iaSimulacaoRoutes_1.default); // 2. Registra a rota de simulação sob o prefixo /ia
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
/**
 * Endpoint de comunicação com a IA
 * Acessível em: POST http://localhost:3000/ia
 */ 
