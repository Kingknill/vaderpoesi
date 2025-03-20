import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import NodeCache from 'node-cache';
import path from 'path';
import { fileURLToPath } from 'url';
import Mailchimp from 'mailchimp-api-v3';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Fix __dirname för ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const cache = new NodeCache({ stdTTL: 3600 });

// Lägg till CORS-stöd
app.use(cors());

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBo2RfBpPFMeeOqFwq0Ff1JlHCGcovtgQM",
  authDomain: "weather-poetry.firebaseapp.com",
  projectId: "weather-poetry",
  storageBucket: "weather-poetry.firebasestorage.app",
  messagingSenderId: "180565121048",
  appId: "1:180565121048:web:55eb41875eaffc8c848b6d",
  measurementId: "G-YERD8SWQ3L"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Statiska filer ligger i rotmappen
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Route för att servera index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Hämtar väderdata
app.get("/api/weather", async (req, res) => {
  const city = req.query.city;
  if (!city) {
    console.error("Fel: Stad saknas i /weather-anrop");
    return res.status(400).json({ error: "Stad måste anges" });
  }

  const cacheKey = `weather-${city}`;
  const cachedWeather = cache.get(cacheKey);
  if (cachedWeather) {
    console.log(`Returnerar cachad väderdata för ${city}`);
    return res.json(cachedWeather);
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error("Fel: OPENWEATHER_API_KEY saknas");
    return res.status(500).json({ error: "Serverkonfigurationsfel" });
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Fel vid väderhämtning för ${city}: ${response.status} ${response.statusText}`);
      return res.status(404).json({ error: "Staden hittades inte" });
    }
    const data = await response.json();
    const weatherData = { weather: data.weather[0].main, temp: data.main.temp };
    cache.set(cacheKey, weatherData);
    res.json(weatherData);
  } catch (error) {
    console.error("Fel vid väderhämtning:", error.message);
    res.status(500).json({ error: "Kunde inte hämta väderdata" });
  }
});

// Hämtar väderprognos
app.get("/api/forecast", async (req, res) => {
  const city = req.query.city;
  if (!city) {
    console.error("Fel: Stad saknas i /forecast-anrop");
    return res.status(400).json({ error: "Stad måste anges" });
  }

  const cacheKey = `forecast-${city}`;
  const cachedForecast = cache.get(cacheKey);
  if (cachedForecast) {
    console.log(`Returnerar cachad prognos för ${city}`);
    return res.json(cachedForecast);
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error("Fel: OPENWEATHER_API_KEY saknas");
    return res.status(500).json({ error: "Serverkonfigurationsfel" });
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Fel vid prognoshämtning för ${city}: ${response.status} ${response.statusText}`);
      return res.status(404).json({ error: "Staden hittades inte" });
    }
    const data = await response.json();
    const forecast = data.list.slice(0, 5).map(item => ({
      date: new Date(item.dt * 1000).toLocaleDateString(),
      weather: item.weather[0].main,
      temp: Math.round(item.main.temp)
    }));
    cache.set(cacheKey, forecast);
    res.json(forecast);
  } catch (error) {
    console.error("Fel vid prognoshämtning:", error.message);
    res.status(500).json({ error: "Kunde inte hämta prognos" });
  }
});

// Geokodning för autocomplete och omvänd geokodning
app.get("/api/geocode", async (req, res) => {
  const { query, lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error("Fel: OPENWEATHER_API_KEY saknas");
    return res.status(500).json({ error: "Serverkonfigurationsfel" });
  }

  let url;
  if (query) {
    url = `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`;
  } else if (lat && lon) {
    url = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=5&appid=${apiKey}`;
  } else {
    console.error("Fel: Ogiltig förfrågan till /geocode");
    return res.status(400).json({ error: "Ogiltig förfrågan" });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Fel vid geokodning: ${response.status} ${response.statusText}`);
      return res.status(200).json([]); // Returnera tom array istället för ett fel
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Fel vid geokodning:", error.message);
    res.status(200).json([]); // Returnera tom array vid fel
  }
});

// Generera poesi
app.post("/api/generate", async (req, res) => {
  console.log("Received language:", req.body.language);
  const { weather, temp, name, mood, language, city } = req.body;
  
  if (!city) {
    console.error("Fel: Stad saknas i /generate-anrop");
    return res.status(400).json({ error: "Stad måste anges" });
  }

  const cacheKey = `${weather}-${temp}-${name || ""}-${mood || ""}-${language}-${city}`;

  const cachedItem = cache.get(cacheKey);
  if (cachedItem) {
    console.log(`Returnerar cachad poesi för nyckel: ${cacheKey}`);
    return res.json({ emotion: cachedItem.data });
  }

  // Hämta prognosdata
  let forecast = [];
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.error("Fel: OPENWEATHER_API_KEY saknas");
      return res.status(500).json({ error: "Serverkonfigurationsfel" });
    }

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
    const forecastResponse = await fetch(forecastUrl);
    
    if (forecastResponse.ok) {
      const forecastData = await forecastResponse.json();
      forecast = forecastData.list.slice(0, 5).map(item => ({
        date: new Date(item.dt * 1000).toLocaleDateString(),
        weather: item.weather[0].main,
        temp: Math.round(item.main.temp)
      }));
    } else {
      console.warn(`Kunde inte hämta prognos för ${city}, fortsätter med endast aktuellt väder`);
    }
  } catch (error) {
    console.warn("Fel vid prognoshämtning, fortsätter med endast aktuellt väder:", error.message);
  }

  const prompt = `
  You are a poet tasked with writing a short poetic text (2-3 sentences) about the weather based on the following data: weather "${weather}" and temperature ${temp}°C${forecast.length > 0 ? `, and forecast: ${JSON.stringify(forecast)}` : ''}. Make the text personal, emotional, and use idiomatic ${language === "sv" ? "Swedish" : "English"}. Avoid illogical metaphors (e.g., cold weather as "warm") and end with a complete sentence.
  Use a strong emotional expression${name ? ` directed to ${name}` : ""}${mood ? ` with a ${mood} tone` : ""}.
  Respond exclusively in ${language === "sv" ? "Swedish" : "English"}.
`;
console.log("Generated prompt:", prompt);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("Fel: GROQ_API_KEY saknas");
    return res.status(500).json({ error: "Serverkonfigurationsfel" });
  }
  try {
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100
      })
    });
    if (!aiResponse.ok) {
      console.error(`Fel vid anrop till Groq API: ${aiResponse.status} ${aiResponse.statusText}`);
      const errorText = await aiResponse.text();
      console.error("Groq API-svar:", errorText);
      return res.status(aiResponse.status).json({ error: `Groq API-fel: ${aiResponse.statusText}` });
    }
    const aiData = await aiResponse.json();
    console.log("Groq API response:", aiData);
    if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
      console.error("Ogiltigt svar från Groq API:", aiData);
      return res.status(500).json({ error: "Ogiltigt svar från poesigenerering" });
    }
    const text = aiData.choices[0].message.content.trim();
    cache.set(cacheKey, { data: text, timestamp: Date.now() });
    res.json({ emotion: text });
  } catch (error) {
    console.error("Fel vid poesigenerering:", error.message);
    res.status(500).json({ error: "Kunde inte generera poesi" });
  }
});

// Hantera kommentarer via Firebase
app.post("/api/comments", async (req, res) => {
  const { comment } = req.body;
  if (!comment) {
    console.error("Fel: Kommentar saknas i /comments-anrop");
    return res.status(400).json({ error: "Kommentar krävs" });
  }
  try {
    const docRef = await addDoc(collection(db, "comments"), {
      text: comment,
      timestamp: new Date().toISOString()
    });
    res.json({ id: docRef.id, success: true });
  } catch (error) {
    console.error("Fel vid sparande av kommentar:", error.message);
    res.status(500).json({ error: "Kunde inte spara kommentar" });
  }
});

// Hämta kommentarer från Firebase
app.get("/api/comments", async (req, res) => {
  try {
    const commentsQuery = query(collection(db, "comments"), orderBy("timestamp", "desc"), limit(10));
    const querySnapshot = await getDocs(commentsQuery);
    const comments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(comments);
  } catch (error) {
    console.error("Fel vid hämtning av kommentarer:", error.message);
    res.status(500).json({ error: "Kunde inte hämta kommentarer" });
  }
});

// Hantera nyhetsbrev via Mailchimp
const md5 = (string) => crypto.createHash('md5').update(string).digest('hex');
app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    console.error("Fel: E-post saknas i /subscribe-anrop");
    return res.status(400).json({ error: "E-post krävs" });
  }
  const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  if (!mailchimpApiKey || !listId) {
    console.error("Fel: MAILCHIMP_API_KEY eller MAILCHIMP_LIST_ID saknas", {
      mailchimpApiKey: !!mailchimpApiKey,
      listId: !!listId
    });
    return res.status(500).json({ error: "Serverkonfigurationsfel" });
  }
  const mailchimp = new Mailchimp(mailchimpApiKey);
  try {
    const subscriberHash = md5(email.toLowerCase());
    console.log(`Försöker prenumerera ${email} med hash ${subscriberHash} på lista ${listId}`);
    await mailchimp.put(`/lists/${listId}/members/${subscriberHash}`, {
      email_address: email,
      status: "subscribed"
    });
    console.log(`Prenumeration lyckades för ${email}`);
    res.json({ success: true, message: "Tack för din prenumeration!" });
  } catch (error) {
    console.error("Fel vid prenumeration:", {
      message: error.message,
      status: error.status,
      response: error.response ? error.response.body : null
    });
    res.status(500).json({ error: "Kunde inte prenumerera, försök igen" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server körs på port ${PORT}`));