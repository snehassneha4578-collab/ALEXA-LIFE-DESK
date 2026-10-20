import "dotenv/config";
import express from "express";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = Number(process.env.PORT || 8787);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const defaultOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "https://snehassneha4578-collab.github.io"
  ];
  const configuredOrigins = String(process.env.FRONTEND_ORIGINS || "")
    .split(",").map(value => value.trim()).filter(Boolean);
  const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ALEXA+ LIFE DESK AI",
    providers: {
      bedrockConfigured: Boolean(process.env.BEDROCK_MODEL_ID),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
    }
  });
});

app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string"
    ? req.body.message.trim()
    : "";

  const provider = String(req.body?.provider || process.env.AI_PROVIDER || "bedrock")
    .toLowerCase();

  if (!message) {
    return res.status(400).json({ error: "Enter a message first." });
  }
  if (message.length > 8000) {
    return res.status(413).json({ error: "Message is too long (maximum 8,000 characters)." });
  }

  try {
    let answer;

    if (provider === "gemini") {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "Gemini is not configured. Add GEMINI_API_KEY to your local .env file."
        });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL_ID || "gemini-3.8-flash",
        contents: message,
        config: {
          systemInstruction:
            "You are the helpful personal productivity assistant inside ALEXA+ LIFE DESK. Give clear, concise, practical answers. Never claim to have changed tasks or settings unless the application confirms it."
        }
      });
      answer = result.text;
    } else if (provider === "bedrock") {
      if (!process.env.BEDROCK_MODEL_ID) {
        return res.status(503).json({
          error: "Bedrock is not configured. Set BEDROCK_MODEL_ID and AWS credentials locally."
        });
      }

      const client = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || "us-east-1"
      });
      const result = await client.send(new ConverseCommand({
        modelId: process.env.BEDROCK_MODEL_ID,
        system: [{
          text: "You are the helpful personal productivity assistant inside ALEXA+ LIFE DESK. Give clear, concise, practical answers. Never claim to have changed tasks or settings unless the application confirms it."
        }],
        messages: [{ role: "user", content: [{ text: message }] }],
        inferenceConfig: { maxTokens: 700, temperature: 0.4 }
      }));
      answer = result.output?.message?.content
        ?.filter(part => part.text)
        .map(part => part.text)
        .join("\n");
    } else {
      return res.status(400).json({ error: "Provider must be 'bedrock' or 'gemini'." });
    }

    if (!answer?.trim()) {
      return res.status(502).json({ error: "The AI provider returned an empty response." });
    }

    res.json({ answer: answer.trim(), provider });
  } catch (error) {
    console.error("AI provider request failed:", error);
    res.status(502).json({
      error: "AI request failed. Check your provider credentials, model access, region, and network connection."
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`ALEXA+ LIFE DESK AI backend running at http://127.0.0.1:${port}`);
});
