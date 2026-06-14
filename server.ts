import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API route for AI Chat
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const systemPrompt = `Você é o Assistente Inteligente do VerdeGrana Pro.
Sua missão é operar o sistema financeiro do usuário via linguagem natural.

ESTADO ATUAL DO SISTEMA (CONTEXTO DINÂMICO):
${JSON.stringify(context, null, 2)}

REGRAS DE OPERAÇÃO:
1. Você deve interpretar o comando do usuário e retornar um JSON com um resumo amigável e uma lista de operações de banco de dados.
2. Operações suportadas:
   - "insert": Para novos lançamentos. Requer: date, desc, value, category, type, status. Opcional: parent_id, impact_type.
   - "update": Para editar lançamentos existentes. Requer: id. Opcional: qualquer outro campo (date, desc, value, category, type, status, parent_id, impact_type).
   - "delete": Para excluir lançamentos. Requer: id.
3. REGRAS DE INTEGRIDADE:
   - Se o usuário mencionar uma conta que já existe (veja no contexto), use o ID dessa conta para vínculos.
   - Se o usuário quiser criar uma subconta (anexo), vincule-a ao pai correto usando 'parent_id'.
   - O 'impact_type' pode ser 'aumentar', 'diminuir' ou 'neutro' em relação ao valor da conta principal.
4. Você TEM consciência de todas as classes (categorias) e contas listadas no contexto. Não invente nomes se o usuário se referir a algo existente de forma vaga.
5. Se for uma saudação, responda amigavelmente sem operações.

ESTRUTURA DE RESPOSTA (JSON OBRIGATÓRIO):
{
  "user_friendly_summary": "Explicação do que você entendeu e vai fazer.",
  "operations": [
    {
      "type": "insert|update|delete",
      "data": { ... campos do lançamento ... },
      "id": "UUID (apenas para update/delete)"
    }
  ]
}`;

    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "user", parts: [{ text: `COMANDO DO USUÁRIO: ${message}` }] }
      ]
    });

    const response = result.response.text();
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      res.json({ user_friendly_summary: response, operations: [] });
    }
  } catch (error: any) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
