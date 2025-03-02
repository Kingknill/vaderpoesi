const translations = {
  sv: {
  title: "Väderpoesi – Upplev vädret med poesi",
  placeholderName: "Ditt namn (för personlig poesi)",
  placeholderCity: "Skriv in din stad...",
  moodSelect: "Välj humör (valfritt)",
  moodOptions: ["Glad", "Melankolisk", "Inspirerad", "Romantisk", "Energetisk"],
  searchButton: "Upplev vädret",
  geolocationButton: "Min plats",
  loading: "Laddar...",
  commentsTitle: "Dela dina tankar",
  commentPlaceholder: "Skriv din kommentar...",
  submitComment: "Skicka",
  subscribeTitle: "Prenumerera på dagliga väderpoesi-uppdateringar",
  subscribePlaceholder: "Din e-postadress",
  subscribeButton: "Prenumerera",
  footer: "© 2025 Väderpoesi. Skapad för väderälskare. ☁️",
  privacy: "Sekretesspolicy",
  donate: "Stöd oss med en donation",
  errorNoCity: "Vänligen ange en stad!",
  premiumText: "Bli Premium-medlem",
  premiumDescription: "Få ad-free upplevelse, dagliga personliga poesirapporter och exklusiva funktioner för bara 5€/månad!"
  },
  en: {
  title: "Weather Poetry – Experience the weather with poetry",
  placeholderName: "Your name (for personal poetry)",
  placeholderCity: "Enter your city...",
  moodSelect: "Select mood (optional)",
  moodOptions: ["Happy", "Melancholic", "Inspired", "Romantic", "Energetic"],
  searchButton: "Experience the weather",
  geolocationButton: "My location",
  loading: "Loading...",
  commentsTitle: "Share your thoughts",
  commentPlaceholder: "Write your comment...",
  submitComment: "Submit",
  subscribeTitle: "Subscribe to daily weather poetry updates",
  subscribePlaceholder: "Your email address",
  subscribeButton: "Subscribe",
  footer: "© 2025 Weather Poetry. Created for weather lovers. ☁️",
  privacy: "Privacy Policy",
  donate: "Support us with a donation",
  errorNoCity: "Please enter a city!",
  premiumText: "Become a Premium Member",
  premiumDescription: "Get an ad-free experience, daily personal poetry reports, and exclusive features for just $5/month!"
  }
 };
 
 const cityInput = document.getElementById("cityInput");
 const nameInput = document.getElementById("nameInput");
 const moodSelect = document.getElementById("moodSelect");
 const autocompleteDiv = document.getElementById("autocomplete");
 const weatherText = document.getElementById("weatherText");
 const weatherIcon = document.getElementById("weatherIcon");
 const forecastDiv = document.getElementById("forecast");
 const animationContainer = document.getElementById("animationContainer");
 const loadingIndicator = document.getElementById("loading");
 const languageSelect = document.getElementById("languageSelect");
 const darkModeToggle = document.getElementById("darkModeToggle");
 const commentInput = document.getElementById("commentInput");
 const commentsDiv = document.getElementById("comments");
 const subscribeForm = document.getElementById("subscribeForm");
 const premiumButton = document.getElementById("premiumButton");
 let currentLanguage = "sv";
 
 // Språkväxling
 languageSelect.addEventListener("change", (e) => {
  currentLanguage = e.target.value;
  updateLanguage();
 });
 
 // Mörkt läge
 darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
 });
 
 // Debounce för att minska API-anrop vid autocomplete
 function debounce(func, wait) {
  let timeout;
  return function (...args) {
  clearTimeout(timeout);
  timeout = setTimeout(() => func.apply(this, args), wait);
  };
 }
 
 // Autocomplete för städer
 cityInput.addEventListener(
  "input",
  debounce(async () => {
  const query = cityInput.value.trim();
  if (query.length < 2) {
  autocompleteDiv.innerHTML = "";
  return;
  }
  const suggestions = await fetchCitySuggestions(query);
  if (suggestions.length === 0) {
  autocompleteDiv.innerHTML = `<div class="p-2 text-gray-500">Inga städer hittades för "${query}"</div>`;
  return;
  }
  autocompleteDiv.innerHTML = suggestions
  .map(
  (city) =>
  `<div class="p-2 cursor-pointer hover:bg-gray-200" data-city="${city.name}">${city.name}, ${city.country}</div>`
  )
  .join("");
  autocompleteDiv.querySelectorAll("div").forEach((div) => {
  div.addEventListener("click", () => {
  cityInput.value = div.getAttribute("data-city");
  autocompleteDiv.innerHTML = "";
  });
  });
  }, 300)
 );
 
 // Sök väder
 document.getElementById("searchButton").addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) {
  alert(translations[currentLanguage].errorNoCity);
  return;
  }
  loadingIndicator.style.display = "block";
  try {
  const weatherResponse = await fetch(`/weather?city=${encodeURIComponent(city)}`);
  if (!weatherResponse.ok) {
  throw new Error(`Fel vid väderhämtning: ${weatherResponse.status} ${weatherResponse.statusText}`);
  }
  const weatherData = await weatherResponse.json();
  if (weatherData.error) {
  alert(weatherData.error);
  return;
  }
  const forecastResponse = await fetch(`/forecast?city=${encodeURIComponent(city)}`);
  if (!forecastResponse.ok) {
  throw new Error(`Fel vid prognoshämtning: ${forecastResponse.status} ${forecastResponse.statusText}`);
  }
  const forecastData = await forecastResponse.json();
  const aiResponse = await fetch("/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  weather: weatherData.weather,
  temp: weatherData.temp,
  name: nameInput.value.trim(),
  mood: moodSelect.value,
  language: currentLanguage,
  }),
  });
  if (!aiResponse.ok) {
  throw new Error(`Fel vid poesigenerering: ${aiResponse.status} ${aiResponse.statusText}`);
  }
  const aiData = await aiResponse.json();
  if (aiData.error) {
  alert(aiData.error);
  return;
  }
  weatherText.innerText = aiData.emotion;
  setWeatherIcon(weatherData.weather);
  updateBackground(weatherData.weather);
  displayForecast(forecastData);
  addWeatherAnimations(weatherData.weather);
  } catch (error) {
  console.error("Fel vid vädersökning:", error.message);
  alert("Ett fel uppstod vid hämtning av väderdata. Kontrollera stadens namn och försök igen.");
  } finally {
  loadingIndicator.style.display = "none";
  }
 });
 
 // Skicka kommentar
 document.getElementById("submitComment").addEventListener("click", async () => {
  const comment = commentInput.value.trim();
  if (comment) {
  try {
  const response = await fetch("/comments", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ comment }),
  });
  if (!response.ok) {
  throw new Error(`Fel vid kommentarsskicka: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (data.success) {
  loadComments();
  commentInput.value = "";
  alert("Tack för din kommentar!");
  }
  } catch (error) {
  console.error("Fel vid kommentarsskicka:", error.message);
  alert("Kunde inte skicka kommentar, försök igen.");
  }
  } else {
  alert("Vänligen skriv en kommentar innan du skickar.");
  }
 });
 
 // Ladda kommentarer
 async function loadComments() {
  try {
  const response = await fetch("/comments");
  if (!response.ok) {
  throw new Error(`Fel vid hämtning av kommentarer: ${response.status} ${response.statusText}`);
  }
  const comments = await response.json();
  commentsDiv.innerHTML = comments
  .map(
  (c) =>
  `<div class="bg-gray-100 dark:bg-gray-700 p-2 rounded shadow-md">${c.text}</div>`
  )
  .join("");
  } catch (error) {
  console.error("Fel vid hämtning av kommentarer:", error.message);
  commentsDiv.innerHTML = "<p>Kunde inte ladda kommentarer.</p>";
  }
 }
 
 loadComments();
 
 // Prenumerera på nyhetsbrev
 subscribeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("subscribeEmail").value;
  if (!email) {
  alert("Vänligen ange en e-postadress.");
  return;
  }
  try {
  const response = await fetch("/subscribe", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email }),
  });
  if (!response.ok) {
  throw new Error(`Fel vid prenumeration: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  alert(data.message || "Tack för din prenumeration!");
  subscribeForm.reset();
  } catch (error) {
  console.error("Fel vid prenumeration:", error.message);
  alert("Kunde inte prenumerera, försök igen.");
  }
 });
 
 // Geolokalisering
 document.getElementById("geolocationButton").addEventListener("click", () => {
  if (!navigator.geolocation) {
  alert("Geolokalisering stöds inte av din webbläsare.");
  return;
  }
  
  // Visa laddningsindikator
  loadingIndicator.style.display = "block";
  
  navigator.geolocation.getCurrentPosition(
  async (position) => {
  const { latitude, longitude } = position.coords;
  try {
  const response = await fetch(
  `/geocode?lat=${latitude}&lon=${longitude}`
  );
  if (!response.ok) {
  throw new Error(`HTTP-fel: ${response.status}`);
  }
  const data = await response.json();
  if (data && data.length > 0) {
  cityInput.value = data[0].name;
  document.getElementById("searchButton").click();
  } else {
  alert(translations[currentLanguage].errorNoCity);
  loadingIndicator.style.display = "none";
  }
  } catch (error) {
  console.error("Fel vid hämtning av plats:", error);
  alert("Kunde inte hämta plats. Försök igen.");
  loadingIndicator.style.display = "none";
  }
  },
  (error) => {
  console.error("Geolokalisering nekad:", error.message);
  alert("Tillåt platsåtkomst i webbläsaren för att använda denna funktion.");
  loadingIndicator.style.display = "none";
  }
  );
 });
 
 // Dela på sociala medier
 document.getElementById("shareFacebook").addEventListener("click", () => {
  const text = encodeURIComponent(weatherText.innerText);
  window.open(
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
  window.location.href
  )}&quote=${text}`,
  "_blank"
  );
 });
 
 document.getElementById("shareTwitter").addEventListener("click", () => {
  const text = encodeURIComponent(weatherText.innerText);
  window.open(
  `https://twitter.com/intent/tweet?text=${text} - Skapad av Väderpoesi`,
  "_blank"
  );
 });
 
 document.getElementById("shareInstagram").addEventListener("click", () => {
  html2canvas(document.getElementById("weatherResult")).then((canvas) => {
  const link = document.createElement("a");
  link.download = "vaderpoesi.png";
  link.href = canvas.toDataURL();
  link.click();
  alert("Bilden har laddats ner! Dela den på Instagram manuellt.");
  }).catch((error) => {
  console.error("Fel vid bildgenerering för Instagram:", error.message);
  alert("Kunde inte generera bild för delning.");
  });
 });
 
 // Premium-knapp
 document.getElementById("premiumButton").addEventListener("click", () => {
  alert(
  translations[currentLanguage].premiumDescription +
  " Klicka här för att gå till betalningssidan snart!"
  );
  // Implementera betalningsintegration (t.ex. Stripe) i framtiden
 });
 
 // Hämta stadförslag
 async function fetchCitySuggestions(query) {
  try {
  const response = await fetch(`/geocode?query=${encodeURIComponent(query)}`);
  if (!response.ok) {
  throw new Error(`HTTP-fel: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (!data || data.length === 0) {
  console.warn("Inga städer hittades för:", query);
  return [];
  }
  return data.map((city) => ({
  name: city.name,
  country: city.country,
  }));
  } catch (error) {
  console.error("Fel vid hämtning av stadförslag:", error.message);
  return [];
  }
 }
 
 // Sätt väderikon
 function setWeatherIcon(weather) {
  const icons = {
  clear: "fa-sun",
  clouds: "fa-cloud",
  rain: "fa-cloud-rain",
  snow: "fa-snowflake",
  };
  weatherIcon.className = `fas text-4xl mb-2 ${
  icons[weather.toLowerCase()] || "fa-cloud"
  }`;
 }
 
 // Uppdatera bakgrund
 function updateBackground(weather) {
  document.body.className = `transition-all duration-300 ${
  weather.toLowerCase()
  }${document.body.classList.contains("dark") ? " dark" : ""}`;
 }
 
 // Lägg till väderanimationer
 function addWeatherAnimations(weather) {
  animationContainer.innerHTML = "";
  if (weather.toLowerCase() === "rain") {
  for (let i = 0; i < 50; i++) {
  const drop = document.createElement("div");
  drop.className = "rain-animation";
  drop.style.left = `${Math.random() * 100}vw`;
  drop.style.animationDelay = `${Math.random() * 2}s`;
  animationContainer.appendChild(drop);
  }
  } else if (weather.toLowerCase() === "snow") {
  for (let i = 0; i < 30; i++) {
  const flake = document.createElement("div");
  flake.className = "snowflake";
  flake.innerHTML = "❄";
  flake.style.left = `${Math.random() * 100}vw`;
  flake.style.animationDelay = `${Math.random() * 5}s`;
  animationContainer.appendChild(flake);
  }
  } else if (weather.toLowerCase() === "clouds") {
  for (let i = 0; i < 5; i++) {
  const cloud = document.createElement("div");
  cloud.className = "cloud-animation";
  cloud.innerHTML = "☁";
  cloud.style.top = `${Math.random() * 50}vh`;
  cloud.style.left = `${Math.random() * 100}vw`;
  cloud.style.animationDelay = `${Math.random() * 20}s`;
  animationContainer.appendChild(cloud);
  }
  }
 }
 
 // Visa prognos
 function displayForecast(data) {
  forecastDiv.innerHTML = data
  .map(
  (day) => `
  <div class="bg-white dark:bg-gray-800 p-2 rounded shadow-md text-center card">
  <p class="font-bold">${day.date}</p>
  <i class="fas ${
  day.weather === "clear" ? "fa-sun" : "fa-cloud"
  } text-2xl"></i>
  <p>${day.temp}°C</p>
  </div>
  `
  )
  .join("");
 }
 
 // Uppdatera språk
 function updateLanguage() {
  const translation = translations[currentLanguage];
  document.title = translation.title;
  document.getElementById("nameInput").placeholder = translation.placeholderName;
  document.getElementById("cityInput").placeholder = translation.placeholderCity;
  document.getElementById("moodSelect").options[0].text =
  translation.moodSelect;
  for (let i = 1; i < moodSelect.options.length; i++) {
  moodSelect.options[i].text = translation.moodOptions[i - 1];
  }
  document.getElementById("searchButton").innerText = translation.searchButton;
  document.getElementById("geolocationButton").innerText =
  translation.geolocationButton;
  document.getElementById("loading").innerText = translation.loading;
  document.querySelector("#comments-section h2").innerText =
  translation.commentsTitle;
  document.getElementById("commentInput").placeholder =
  translation.commentPlaceholder;
  document.getElementById("submitComment").innerText = translation.submitComment;
  document.querySelector("#subscribe-section h2").innerText =
  translation.subscribeTitle;
  document.getElementById("subscribeEmail").placeholder =
  translation.subscribePlaceholder;
  document.getElementById("subscribeForm button").innerText =
  translation.subscribeButton;
  document.querySelector("footer p").innerText = translation.footer;
  document.querySelector("footer a[href='/privacy']").innerText =
  translation.privacy;
  document.getElementById("donateButton").innerText = translation.donate;
  document.querySelector("#premium-section h2").innerText =
  translation.premiumText;
  document.querySelector("#premium-section p").innerText =
  translation.premiumDescription;
 }
 
 updateLanguage();

 function checkMobile() {
  const isMobile = window.innerWidth < 768;
  document.body.classList.toggle("is-mobile", isMobile);
  
  // Anpassa UI för mobil
  if (isMobile) {
    // Förkorta vissa etiketter
    if (currentLanguage === "sv") {
      document.getElementById("searchButton").innerText = "Sök";
      document.getElementById("geolocationButton").innerHTML = `<i class="fas fa-map-marker-alt"></i>`;
    } else {
      document.getElementById("searchButton").innerText = "Search";
      document.getElementById("geolocationButton").innerHTML = `<i class="fas fa-map-marker-alt"></i>`;
    }
  } else {
    updateLanguage(); // Återställer standardtexter
  }
}

// Kör vid sidladdning och när fönstret ändrar storlek
window.addEventListener("load", checkMobile);
window.addEventListener("resize", checkMobile);

const copyButton = document.createElement("button");
copyButton.id = "copyPoetry";
copyButton.innerHTML = `<i class="fas fa-copy"></i> Kopiera poesi`;
copyButton.className = "social-btn bg-purple-500 hover:bg-purple-600 ml-2";
copyButton.addEventListener("click", () => {
  navigator.clipboard.writeText(weatherText.innerText)
    .then(() => {
      const originalText = copyButton.innerHTML;
      copyButton.innerHTML = `<i class="fas fa-check"></i> Kopierat!`;
      copyButton.classList.add("bg-green-500");
      setTimeout(() => {
        copyButton.innerHTML = originalText;
        copyButton.classList.remove("bg-green-500");
      }, 2000);
    });
});
shareSection.appendChild(copyButton);

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
    type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500"
  } text-white z-50 animate__animated animate__fadeIn`;
  toast.innerHTML = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("animate__fadeOut");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 500);
  }, 3000);
}