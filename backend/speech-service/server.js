const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: '*', // In production, restrict this to your frontend domain
  methods: ['GET', 'POST'],
  credentials: true
}));

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Translation API endpoint (LibreTranslate)
const TRANSLATION_API_URL = process.env.TRANSLATION_API_URL || 'http://translate.prismconnect.app:5000/translate';

// Store active rooms and their participants
const rooms = {};

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle audio data for speech recognition
  socket.on('audioData', async (data) => {
    try {
      const { roomId, audioBlob, language } = data;
      
      // In a real implementation, this would process the audio data
      // and perform speech recognition
      // For this example, we'll simulate recognition with a placeholder
      
      console.log(`Received audio data from room ${roomId}, language: ${language}`);
      
      // Simulate speech recognition result
      const recognizedText = simulateRecognition(language);
      
      // Send the recognized text back to the client
      socket.emit('recognitionResult', { text: recognizedText, language });
      
      // If room exists, send to other participants for translation
      if (rooms[roomId]) {
        // Get target language (opposite of source)
        const targetLang = language === 'en-US' ? 'vi' : 'en';
        const sourceLang = language === 'en-US' ? 'en' : 'vi';
        
        // Translate the text
        try {
          const translatedText = await translateText(recognizedText, sourceLang, targetLang);
          
          // Broadcast translation to all clients in the room except sender
          socket.to(roomId).emit('translationResult', { 
            originalText: recognizedText,
            translatedText,
            sourceLang,
            targetLang
          });
        } catch (error) {
          console.error('Translation error:', error);
          socket.emit('error', { message: 'Translation failed' });
        }
      }
    } catch (error) {
      console.error('Speech recognition error:', error);
      socket.emit('error', { message: 'Speech recognition failed' });
    }
  });

  // Handle room creation and joining
  socket.on('joinRoom', (data) => {
    const { roomId, userId } = data;
    
    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = { participants: [] };
    }
    
    // Add user to room
    rooms[roomId].participants.push({
      socketId: socket.id,
      userId
    });
    
    // Join the Socket.IO room
    socket.join(roomId);
    
    console.log(`User ${userId} joined room ${roomId}`);
    
    // Notify all clients in the room
    io.to(roomId).emit('userJoined', { 
      roomId, 
      userId,
      participants: rooms[roomId].participants 
    });
  });

  // Handle direct translation requests
  socket.on('translateText', async (data) => {
    try {
      const { text, from, to, roomId } = data;
      
      // Translate the text
      const translatedText = await translateText(text, from, to);
      
      // Send translation back to the client
      socket.emit('translationResult', { 
        originalText: text,
        translatedText,
        sourceLang: from,
        targetLang: to
      });
      
      // If roomId is provided, broadcast to other participants
      if (roomId) {
        socket.to(roomId).emit('translationResult', { 
          originalText: text,
          translatedText,
          sourceLang: from,
          targetLang: to
        });
      }
    } catch (error) {
      console.error('Translation error:', error);
      socket.emit('error', { message: 'Translation failed' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove user from all rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const participantIndex = room.participants.findIndex(p => p.socketId === socket.id);
      
      if (participantIndex !== -1) {
        const userId = room.participants[participantIndex].userId;
        room.participants.splice(participantIndex, 1);
        
        console.log(`User ${userId} left room ${roomId}`);
        
        // Notify remaining participants
        io.to(roomId).emit('userLeft', { roomId, userId });
        
        // Clean up empty rooms
        if (room.participants.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
    }
  });
});

// Function to translate text using LibreTranslate
async function translateText(text, sourceLang, targetLang) {
  try {
    const response = await fetch(TRANSLATION_API_URL, {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('Translation API error:', error);
    // Return original text with error indicator if translation fails
    return `[Translation error: ${error.message}]`;
  }
}

// Function to simulate speech recognition (for development)
function simulateRecognition(language) {
  // In a real implementation, this would process audio data
  // For now, we'll return placeholder text based on language
  const phrases = {
    'en-US': [
      "Hello, how are you today?",
      "I'm testing the translation feature.",
      "This is a video call with real-time translation.",
      "The weather is nice today.",
      "Can you understand what I'm saying?"
    ],
    'vi-VN': [
      "Xin chào, hôm nay bạn khỏe không?",
      "Tôi đang kiểm tra tính năng dịch.",
      "Đây là cuộc gọi video với bản dịch thời gian thực.",
      "Thời tiết hôm nay đẹp.",
      "Bạn có hiểu những gì tôi đang nói không?"
    ]
  };
  
  const langPhrases = phrases[language] || phrases['en-US'];
  const randomIndex = Math.floor(Math.random() * langPhrases.length);
  
  return langPhrases[randomIndex];
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Speech recognition service running on port ${PORT}`);
});
