import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import authRoutes from './auth.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Conversation from './models/Conversation.js';
// REMOVE THESE REDIS IMPORTS:
// import { createClient } from 'redis';
import { fileURLToPath } from 'url';
import path from 'path';


dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// --- IN-MEMORY CACHE IMPLEMENTATION ---
// Declare a simple Map to store chat history in memory
const inMemoryCache = new Map();

// REMOVE THE ENTIRE initializeRedis FUNCTION AND ITS CALL
/*
let redisClient;
const initializeRedis = async () => {
  try {
    console.log(`Attempting to connect to Redis at: <span class="math-inline">\{process\.env\.REDIS\_HOST\}\:</span>{process.env.REDIS_PORT}`);
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
      }
    });
    redisClient.on('error', err => console.error('Redis Client Error event:', err));
    redisClient.on('connect', () => console.log('Redis client "connect" event fired!'));
    redisClient.on('ready', () => console.log('Redis client "ready" event fired! Redis connection is established.'));
    await redisClient.connect();
    console.log('Redis client.connect() completed successfully!');
    app.locals.redisClient = redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis during initialization:', error);
  }
};
initializeRedis();
*/
// --- END IN-MEMORY CACHE IMPLEMENTATION ---


const SECRET = 'cs144project';
const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
console.log("Attempting to register static middleware for:", path.join(__dirname, 'dist'));
app.use(express.static(path.join(__dirname, 'dist')));

console.log("Attempting to register /api/conversations")
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

console.log("Attempting to register /api/ask")
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

  const lastDoctorMsg = history
    .filter(msg => msg.from === "doctor")
    .at(-1)?.text.toLowerCase() || "";

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

    // --- CACHE THE CONVERSATION IN-MEMORY ---
    inMemoryCache.set(`chat:${username}`, { history: fullHistory, correctDiagnosis });
    console.log('Cached chat history in memory for', username);
    // --- END CACHING ---

  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ reply: "Sorry, something went wrong." });
  }
});

console.log("Attempting to register /api/history")
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

console.log("Attempting to register /api/conversations route: /api/conversation")
app.get('/api/conversation', async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { username } = jwt.verify(token, SECRET);
    // --- RETRIEVE FROM IN-MEMORY CACHE ---
    const cached = inMemoryCache.get(`chat:${username}`);
    if (cached) {
      console.log('Retrieved chat history from in-memory cache for', username);
      return res.json(cached);
    }
    console.log('No chat history found in in-memory cache for', username);
    // --- END RETRIEVAL ---

    return res.json(null); // No cache hit, return null
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

console.log("Attempting to register catch-all route: /*");
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});