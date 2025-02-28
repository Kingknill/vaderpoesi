const express = require("express");
const fetch = require("node-fetch");
const NodeCache = require("node-cache");
const path = require("path");
const Mailchimp = require("mailchimp-api-v3");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } = require("firebase/firestore");
const app = express();
require("dotenv").config();

const cache = new NodeCache({ stdTTL: 3600 }); // 1 timme TTL

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "vaderpoesi.firebaseapp.com",
  projectId: "vaderpoesi",
  storageBucket: "vaderpoesi.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef1234567890"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Serve index.html at the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Hämtar aktuellt väder
app.get("/weather", async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: "Stad måste anges" });

  const cacheKey = `weather-${city}`;
  const cachedWeather = cache.get(cacheKey);
  if (cachedWeather) return res.json(cachedWeather);

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.cod !== 200) return res.status(404).json({ error: "Stad inte hittad" });
    const weatherData = { weather: data.weather[0].main, temp: data.main.temp };
    cache.set(cacheKey, weatherData);
    res.json(weatherData);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ error: "Kunde inte hämta väderdata" });
  }
});

// Hämtar väderprognos
app.get("/forecast", async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: "Stad måste anges" });

  const cacheKey = `forecast-${city}`;
  const cachedForecast = cache.get(cacheKey);
  if (cachedForecast) return res.json(cachedForecast);

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.cod !== "200") return res.status(404).json({ error: "Stad inte hittad" });
    const forecast = data.list.slice(0, 5).map(item => ({
      date: new Date(item.dt * 1000).toLocaleDateString(),
      weather: item.weather[0].main,
      temp: Math.round(item.main.temp)
    }));
    cache.set(cacheKey, forecast);
    res.json(forecast);
  } catch (error) {
    console.error("Error fetching forecast data:", error);
    res.status(500).json({ error: "Kunde inte hämta prognos" });
  }
});

// Geokodning (sök och omvänd sökning)
app.get("/geocode", async (req, res) => {
  if (req.query.query) {
    const queryParam = req.query.query;
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    const url = `http://api.openweathermap.org/geo/1.0/direct?q=${queryParam}&limit=5&appid=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching geocode data:", error);
      res.status(500).json({ error: "Kunde inte hämta platsförslag" });
    }
  } else if (req.query.lat && req.query.lon) {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    const url = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=5&appid=${apiKey}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching reverse geocode data:", error);
      res.status(500).json({ error: "Kunde inte hämta platsförslag" });
    }
  } else {
    res.status(400).json({ error: "Ogiltig förfrågan" });
  }
});

// AI-genererad väderpoesi
app.post("/generate", async (req, res) => {
  const { weather, temp, name, mood, language } = req.body;
  const cacheKey = `${weather}-${temp}-${name || ""}-${mood || ""}-${language}`;
  const cachedItem = cache.get(cacheKey);
  if (cachedItem) return res.json({ emotion: cachedItem.data });

  const prompt = `
    Du är en passionerad väderpoet. Beskriv vädret "${weather}" och temperaturen ${temp}°C med ett starkt känslomässigt uttryck${name ? ` riktat till ${name}` : ""}${mood ? ` med en ${mood} ton` : ""}. 
    Använd poetiska uttryck och levande bilder. Svara på ${language === "sv" ? "svenska" : "engelska"}. Max 2 meningar.
  `;

  try {
    const aiResponse = await fetch("https://api.groq.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({ prompt, max_tokens: 50 })
    });
    const aiData = await aiResponse.json();
    const text = aiData.choices[0].text.trim();
    cache.set(cacheKey, { data: text, timestamp: Date.now() });
    res.json({ emotion: text });
  } catch (error) {
    console.error("Error during AI generation:", error);
    res.status(500).json({ error: "Kunde inte generera poesi" });
  }
});

// Kommentarhantering med Firebase
app.post("/comments", async (req, res) => {
  const { comment } = req.body;
  try {
    const docRef = await addDoc(collection(db, "comments"), {
      text: comment,
      timestamp: new Date().toISOString()
    });
    res.json({ id: docRef.id, success: true });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Kunde inte spara kommentar" });
  }
});

app.get("/comments", async (req, res) => {
  try {
    const commentsQuery = query(collection(db, "comments"), orderBy("timestamp", "desc"), limit(10));
    const querySnapshot = await getDocs(commentsQuery);
    const comments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Kunde inte hämta kommentarer" });
  }
});

// Prenumeration med Mailchimp
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  const mailchimp = new Mailchimp(process.env.MAILCHIMP_API_KEY);
  try {
    await mailchimp.post(`/lists/${process.env.MAILCHIMP_LIST_ID}/members`, {
      email_address: email,
      status: "subscribed"
    });
    res.json({ success: true, message: "Tack för din prenumeration!" });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({ error: "Kunde inte prenumerera, försök igen" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server körs på port ${PORT}`));
