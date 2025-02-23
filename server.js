const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cache = new Map();
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Cache expiry
const cacheExpiryTime = 10 * 60 * 1000;
setInterval(() => {
  cache.forEach((value, key) => {
    if (Date.now() - value.timestamp > cacheExpiryTime) cache.delete(key);
  });
}, 60 * 1000);

// AI21 Labs with retry logic
const maxRetries = 3;
const timeoutDuration = 15000;

async function getAIResponse(prompt) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const response = await Promise.race([
        fetch("https://api.ai21.com/studio/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.AI21_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "jamba-1.5-large",
            messages: [
              { role: "system", content: "Du är en poetisk väderalgoritm med förmåga att väcka längtan. Kombinera naturfenomen med mänskliga erfarenheter. Använd livfulla adjektiv, sensoriska detaljer och oväntade jämförelser. Undvik klischéer." },
              { role: "user", content: prompt }
            ],
            n: 1,
            max_tokens: 200,
            temperature: 0.7,
            top_p: 0.9,
            response_format: { type: "text" }
          }),
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("AI request timed out")), timeoutDuration))
      ]);

      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content.trim();
      }
      throw new Error(data.error?.message || "AI svarade inte korrekt.");
    } catch (error) {
      console.error("Fel vid AI21-anrop:", error.message);
      retries++;
      if (retries < maxRetries) {
        console.log(`Försöker igen (${retries}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        throw new Error("AI21 svarade inte efter flera försök.");
      }
    }
  }
}

// Weather endpoint
app.get('/weather', async (req, res) => {
  const { city, lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  let url = `https://api.openweathermap.org/data/2.5/weather?appid=${apiKey}&units=metric&lang=sv`;

  if (city) url += `&q=${city}`;
  else if (lat && lon) url += `&lat=${lat}&lon=${lon}`;
  else return res.status(400).json({ error: "Ange stad eller koordinater" });

  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(404).json({ error: `Staden eller positionen hittades inte (status ${response.status})` });
    const data = await response.json();
    res.json({ weather: data.weather[0].description, temp: data.main.temp, city: data.name });
  } catch (error) {
    console.error("Fel vid väderhämtning:", error);
    res.status(500).json({ error: "Kunde inte hämta väderdata" });
  }
});

// Forecast endpoint
app.get('/forecast', async (req, res) => {
  const { city } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=sv`;

  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(404).json({ error: "Staden hittades inte" });
    const data = await response.json();
    const forecast = data.list.filter((_, i) => i % 8 === 0).slice(0, 5).map(day => ({
      date: new Date(day.dt * 1000).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' }),
      weather: day.weather[0].description,
      temp: Math.round(day.main.temp)
    }));
    res.json(forecast);
  } catch (error) {
    console.error("Fel vid prognoshämtning:", error);
    res.status(500).json({ error: "Kunde inte hämta prognos" });
  }
});

// Autocomplete endpoint
app.get('/autocomplete', async (req, res) => {
  const { q } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  try {
    const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=5&appid=${apiKey}`);
    const data = await response.json();
    const citySuggestions = data.map(city => ({
      name: `${city.name}, ${city.country}`,
      lat: city.lat,
      lon: city.lon
    }));
    res.json(citySuggestions);
  } catch (error) {
    console.error("Fel vid stadssökning:", error);
    res.status(500).json({ error: "Kunde inte hämta städer" });
  }
});

// Generate AI response endpoint
app.post('/generate', async (req, res) => {
  const { weather, temp, name } = req.body;
  const emotionScore = Math.floor(Math.random() * 3);
  const cacheKey = `${weather}-${temp}-${emotionScore}-${name || ''}`;

  const cachedItem = cache.get(cacheKey);
  if (cachedItem && (Date.now() - cachedItem.timestamp < cacheExpiryTime)) {
    return res.json({ emotion: cachedItem.data });
  }

  const prompt = `
    Du är en passionerad väderpoet som talar med hjärtat. 
    Beskriv vädret "${weather}" och temperaturen ${temp}°C med ett starkt känslomässigt uttryck${name ? ` riktat till ${name}` : ''}. 
    Målet är att få läsaren att känna värme, längtan och inspiration, men kanske också något oväntat.
    Använd gärna poetiska uttryck och levande bilder.
    Glöm inte att nämna det faktiska vädret och temperaturen.
    Ditt svar (max 2 meningar):
  `;

  try {
    const aiResponse = await getAIResponse(prompt);
    cache.set(cacheKey, { data: aiResponse, timestamp: Date.now() });
    res.json({ emotion: aiResponse });
  } catch (error) {
    console.error("Fel vid AI-generering:", error);
    res.status(500).json({ error: "Kunde inte generera AI-svar" });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Use the port provided by Render or default to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servern körs på port ${PORT}`);
});