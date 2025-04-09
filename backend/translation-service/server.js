const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS
app.use(cors({
  origin: '*', // In production, restrict this to your frontend domain
  methods: ['GET', 'POST'],
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// LibreTranslate API endpoint
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://translate.prismconnect.app:5000';

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' }
];

// Get supported languages
app.get('/languages', async (req, res) => {
  try {
    // In a production environment, you might want to fetch this from LibreTranslate
    // For simplicity, we're using a predefined list
    res.json(SUPPORTED_LANGUAGES);
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
});

// Translate text
app.post('/translate', async (req, res) => {
  try {
    const { text, source, target } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    if (!source) {
      return res.status(400).json({ error: 'Source language is required' });
    }
    
    if (!target) {
      return res.status(400).json({ error: 'Target language is required' });
    }
    
    // Validate languages
    const isSourceSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === source);
    const isTargetSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === target);
    
    if (!isSourceSupported) {
      return res.status(400).json({ error: `Source language '${source}' is not supported` });
    }
    
    if (!isTargetSupported) {
      return res.status(400).json({ error: `Target language '${target}' is not supported` });
    }
    
    // Call LibreTranslate API
    const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: source,
        target: target,
        format: 'text'
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`LibreTranslate API error: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    // Return translated text
    res.json({
      originalText: text,
      translatedText: data.translatedText,
      source,
      target
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed', details: error.message });
  }
});

// Detect language
app.post('/detect', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Call LibreTranslate API for language detection
    const response = await fetch(`${LIBRETRANSLATE_URL}/detect`, {
      method: 'POST',
      body: JSON.stringify({ q: text }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`LibreTranslate API error: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    // Return detected language
    res.json(data);
  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({ error: 'Language detection failed', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Translation service running on port ${PORT}`);
});
