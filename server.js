const express = require("express");
const fetch = require("node-fetch");
const NodeCache = require("node-cache");
const path = require("path");
const Mailchimp = require("mailchimp-api-v3");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } = require("firebase/firestore");
const app = express();
require("dotenv").config();

const cache = new NodeCache({ stdTTL: 3600 });

// Firebase configuration - Ersätt med dina Firebase-uppgifter
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "din_firebase_api_nyckel",
  authDomain: "vaderpoesi.firebaseapp.com",
  projectId: "vaderpoesi",
  storageBucket: "vaderpoesi.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef1234567890"
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
app.get("/weather", async (req, res) => {
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

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    console.error("Fel: OPENWEATHERMAP_API_KEY saknas");
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
app.get("/forecast", async (req, res) => {
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

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    console.error("Fel: OPENWEATHERMAP_API_KEY saknas");
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
app.get("/geocode", async (req, res) => {
  const { query, lat, lon } = req.query;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    console.error("Fel: OPENWEATHERMAP_API_KEY saknas");
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
app.post("/generate", async (req, res) => {
  const { weather, temp, name, mood, language } = req.body;
  const cacheKey = `${weather}-${temp}-${name || ""}-${mood || ""}-${language}`;

  const cachedItem = cache.get(cacheKey);
  if (cachedItem) {
    console.log(`Returnerar cachad poesi för nyckel: ${cacheKey}`);
    return res.json({ emotion: cachedItem.data });
  }

  const prompt = `
    Du är en passionerad väderpoet. Beskriv vädret "${weather}" och temperaturen ${temp}°C med ett starkt känslomässigt uttryck${name ? ` riktat till ${name}` : ""}${mood ? ` med en ${mood} ton` : ""}. 
    Använd poetiska uttryck och levande bilder. Svara på ${language === "sv" ? "svenska" : "engelska"}. Max 2 meningar.
  `;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("Fel: GROQ_API_KEY saknas");
    return res.status(500).json({ error: "Serverkonfigurationsfel" });
  }

  try {
    const aiResponse = await fetch("https://api.groq.com/v1/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ prompt, max_tokens: 50 })
    });
    if (!aiResponse.ok) {
      console.error(`Fel vid poesigenerering: ${aiResponse.status} ${aiResponse.statusText}`);
      return res.status(500).json({ error: "Kunde inte generera poesi" });
    }
    const aiData = await aiResponse.json();
    const text = aiData.choices[0].text.trim();
    cache.set(cacheKey, { data: text, timestamp: Date.now() });
    res.json({ emotion: text });
  } catch (error) {
    console.error("Fel vid poesigenerering:", error.message);
    res.status(500).json({ error: "Kunde inte generera poesi" });
  }
});

// Hantera kommentarer via Firebase
app.post("/comments", async (req, res) => {
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
app.get("/comments", async (req, res) => {
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
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    console.error("Fel: E-post saknas i /subscribe-anrop");
    return res.status(400).json({ error: "E-post krävs" });
  }
  const mailchimpApiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  if (!mailchimpApiKey || !listId) {
    console.error("Fel: MAILCHIMP_API_KEY eller MAILCHIMP_LIST_ID saknas");
    return res.status(500).json({ error: "Serverkonfigurationsfel" });
  }
  const mailchimp = new Mailchimp(mailchimpApiKey);
  try {
    await mailchimp.post(`/lists/${listId}/members`, {
      email_address: email,
      status: "subscribed"
    });
    res.json({ success: true, message: "Tack för din prenumeration!" });
  } catch (error) {
    console.error("Fel vid prenumeration:", error.message);
    res.status(500).json({ error: "Kunde inte prenumerera, försök igen" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server körs på port ${PORT}`));