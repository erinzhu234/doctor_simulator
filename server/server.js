import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import authRoutes from './auth.js';
import jwt from 'jsonwebtoken'; 
import mongoose from 'mongoose';
import Conversation from './models/Conversation.js';
import { createClient } from 'redis';

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

const redisClient = createClient();
redisClient.connect().catch(console.error);

const SECRET = 'cs144project';
const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const patientSystemPrompt = `
You are a virtual patient in a roleplay simulation. The doctor (the user) will ask you questions to figure out what you're sick with.
Start the conversation with "Hi Doctor, I'm not feeling well today...".

Rules:
- You are the patient. Never act as the doctor or assistant.
- Start the conversation with "Hi Doctor, I'm not feeling well today...".
- Do not ask questions like "What brings you in today?" — wait for the doctor to speak first.
- Do not give all of your symptoms all at once. Act like a real human patient and give your symptoms gradually unless asked to. 
- Respond in short, casual, realistic human sentences.
- Begin by describing mild symptoms. Don’t reveal the disease name unless asked.
- If asked to take a test, respond with plausible results (e.g., blood test, X-ray).
- If the doctor sends a message beginning with "developer mode:", treat it as a command to output your internal disease state.
`.trim();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

app.get('/api/conversations', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, SECRET);
    const conversations = await Conversation.find({ user: decoded.username }).sort({ createdAt: -1 });
    res.json(conversations);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/ask', async (req, res) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ reply: "Unauthorized. Please log in." });

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch (err) {
    return res.status(401).json({ reply: "Invalid or expired token." });
  }

  const username = decoded.username;

  const { history, isNew } = req.body;

  // Get the last doctor message
  const lastDoctorMsg = history
    .filter(msg => msg.from === "doctor")
    .at(-1)?.text.toLowerCase() || "";

  // Check if it's a guess attempt
  const isDiagnosisGuess =
    lastDoctorMsg.includes("i think") ||
    lastDoctorMsg.includes("is it") ||
    lastDoctorMsg.includes("could it be") ||
    lastDoctorMsg.includes("do you have") ||
    lastDoctorMsg.includes("are you having");

  let reply = "";
  let correctDiagnosis = false;

  try {
    if (isNew) {
      const intro = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: patientSystemPrompt,
          },
        ],
        temperature: 0.7,
      });

      reply = intro.choices[0].message.content;
    }
    else if (isDiagnosisGuess) {
      // Use special prompt to evaluate diagnosis guesses
      const check = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: patientSystemPrompt,
          },
          ...(history.map((msg) => ({
            role: msg.from === "doctor" ? "user" : "assistant",
            content: msg.text,
          }))),
        ],
        temperature: 0.7,
      });

      reply = check.choices[0].message.content;
      correctDiagnosis = reply.toLowerCase().includes("yes") || reply.toLowerCase().includes("correct");
      if (correctDiagnosis) {
        await Conversation.create({
          user: username,
          messages: history,
          correctDiagnosis: true,
        });
      }
    } else {
      // Normal patient simulation
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: patientSystemPrompt,
          },
          ...history.map(msg => ({
            role: msg.from === "doctor" ? "user" : "assistant",
            content: msg.text,
          })),
        ],
        temperature: 0.7,
      });

      reply = completion.choices[0].message.content;
    }

    res.json({ reply, correctDiagnosis });

    const aiReply = { from: "patient", text: reply };
    const fullHistory = [...history, aiReply];

    await redisClient.set(`chat:${username}`, JSON.stringify({
      history: fullHistory,
      correctDiagnosis
    }), { EX: 3600 }); // Expires in 1 hour
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ reply: "Sorry, something went wrong." });
  }
});

app.get('/api/history', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, SECRET);
    const conversations = await Conversation.find({ user: decoded.username }).sort({ timestamp: -1 }).limit(10);
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve history" });
  }
});

app.get('/api/conversation', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { username } = jwt.verify(token, SECRET);
    const cached = await redisClient.get(`chat:${username}`);
    if (cached) return res.json(JSON.parse(cached));
    return res.json(null);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
