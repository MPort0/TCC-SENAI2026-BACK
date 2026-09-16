import  express  from "express";
import api from "./routes/routes/user";

const app = express()

app.use(express.json())
app.use("/", api)

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000. link: http://localhost:3000/")
})