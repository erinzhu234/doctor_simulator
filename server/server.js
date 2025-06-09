import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import authRoutes from './auth.js';
import jwt from 'jsonwebtoken'; 

dotenv.config();

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
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ reply: "Sorry, something went wrong." });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
