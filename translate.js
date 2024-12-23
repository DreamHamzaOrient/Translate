// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const openai = new OpenAI({
  apiKey: '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'
});

app.use(cors());
app.use(express.json());

// Store audio files temporarily
const audioFiles = new Map();

app.post('/api/transcribe', async (req, res) => {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: req.files.audio,
      model: "whisper-1",
    });
    res.json({ text: transcription.text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: `You are a translator. Translate to ${req.body.targetLanguage}.` },
        { role: "user", content: req.body.text }
      ],
    });
    res.json({ translation: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/speech', async (req, res) => {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: req.body.voice,
      input: req.body.text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const fileId = Date.now().toString();
    audioFiles.set(fileId, buffer);
    res.json({ fileId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/listen/:fileId', (req, res) => {
  const buffer = audioFiles.get(req.params.fileId);
  if (!buffer) {
    return res.status(404).send('Audio not found');
  }
  res.type('audio/mpeg');
  res.send(buffer);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
