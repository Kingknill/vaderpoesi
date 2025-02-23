console.log("Script.js laddades!");

// Globala variabler
let suggestionIndex = -1;
const cityInput = document.getElementById("cityInput");
const nameInput = document.getElementById("nameInput");
const autocompleteDiv = document.getElementById("autocomplete");
const clearButton = document.getElementById("clearButton");
const weatherText = document.getElementById("weatherText");
const weatherIcon = document.getElementById("weatherIcon");
const forecastDiv = document.getElementById("forecast");
const animationContainer = document.getElementById("animationContainer");
const loadingIndicator = document.getElementById("loading");
const favoriteCitiesDiv = document.getElementById("favoriteCities");
const pointsDisplay = document.getElementById("points");
const challengeResponse = document.getElementById("challengeResponse");
const topCityDisplay = document.getElementById("topCity");
let currentCity = "";
let userPoints = parseInt(localStorage.getItem("poesiPoints")) || 0;

// Initial setup
pointsDisplay.textContent = userPoints;

// Autocomplete
async function fetchCitySuggestions(query) {
  try {
    const response = await fetch(`/autocomplete?q=${query}`);
    return await response.json();
  } catch (error) {
    console.error("Fel vid hämtning av stadssökning:", error);
    return [];
  }
}

cityInput.addEventListener("input", async () => {
  const query = cityInput.value.trim();
  clearButton.style.display = query ? "block" : "none";
  autocompleteDiv.innerHTML = "";
  suggestionIndex = -1;

  if (query.length < 2) {
    autocompleteDiv.style.display = "none";
    return;
  }

  const suggestions = await fetchCitySuggestions(query);
  if (suggestions.length > 0) {
    suggestions.forEach(city => {
      const div = document.createElement("div");
      div.textContent = city.name;
      div.classList.add("autocomplete-item");
      div.addEventListener("click", () => {
        cityInput.value = city.name;
        autocompleteDiv.innerHTML = "";
        autocompleteDiv.style.display = "none";
      });
      autocompleteDiv.appendChild(div);
    });
    autocompleteDiv.style.display = "block";
  } else {
    autocompleteDiv.style.display = "none";
  }
});

cityInput.addEventListener("keydown", (e) => {
  const items = autocompleteDiv.querySelectorAll(".autocomplete-item");
  if (items.length === 0) return;

  if (e.key === "ArrowDown") {
    suggestionIndex++;
    if (suggestionIndex >= items.length) suggestionIndex = 0;
    highlightSuggestion(items, suggestionIndex);
    e.preventDefault();
  } else if (e.key === "ArrowUp") {
    suggestionIndex--;
    if (suggestionIndex < 0) suggestionIndex = items.length - 1;
    highlightSuggestion(items, suggestionIndex);
    e.preventDefault();
  } else if (e.key === "Enter" && suggestionIndex > -1) {
    items[suggestionIndex].click();
    suggestionIndex = -1;
    e.preventDefault();
  }
});

function highlightSuggestion(items, index) {
  items.forEach((item, i) => {
    item.classList.toggle("highlight", i === index);
  });
}

document.addEventListener("click", (e) => {
  if (!autocompleteDiv.contains(e.target) && e.target !== cityInput) {
    autocompleteDiv.style.display = "none";
  }
});

// Rensa sökfältet
clearButton.addEventListener("click", () => {
  cityInput.value = "";
  autocompleteDiv.style.display = "none";
  clearButton.style.display = "none";
});

// Geolokalisering
document.getElementById("geolocationButton").addEventListener("click", () => {
  loadingIndicator.style.display = "block";
  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    try {
      const weatherResponse = await fetch(`/weather?lat=${latitude}&lon=${longitude}`);
      const weatherData = await weatherResponse.json();
      if (weatherResponse.ok) {
        currentCity = weatherData.city;
        await displayWeather(weatherData);
        updatePoints(10, "sökte väder med plats");
      } else {
        weatherText.innerHTML = `<p>Kunde inte hämta väderdata för din position.</p>`;
      }
    } catch (error) {
      console.error("Fel vid geolokalisering:", error);
      alert("Ett fel inträffade vid hämtning av väderdata.");
    } finally {
      loadingIndicator.style.display = "none";
    }
  }, () => {
    alert("Kunde inte hämta din position. Kontrollera att du har tillåtit platsåtkomst.");
    loadingIndicator.style.display = "none";
  });
});

// Hämta och visa väder
document.getElementById("searchButton").addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) {
    alert("Ange en stad!");
    return;
  }
  loadingIndicator.style.display = "block";
  try {
    const weatherResponse = await fetch(`/weather?city=${city}`);
    const weatherData = await weatherResponse.json();
    if (!weatherResponse.ok) {
      weatherText.innerHTML = `<p>Vi kunde inte hitta staden. Kontrollera stavningen eller prova en annan stad.</p><p>Populära städer: Stockholm, Göteborg, Malmö</p>`;
      throw new Error(weatherData.error);
    }
    currentCity = city;
    await displayWeather(weatherData);
    updatePoints(10, "sökte väder");
  } catch (error) {
    console.error("Fel:", error);
    alert("Ett fel inträffade, försök igen.");
  } finally {
    loadingIndicator.style.display = "none";
  }
});

async function displayWeather(weatherData) {
  const { weather, temp, city } = weatherData;
  const userName = nameInput.value.trim();
  updateBackground(weather);

  const aiResponse = await fetch('/generate', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weather, temp, name: userName })
  });
  const aiData = await aiResponse.json();
  weatherText.innerText = aiData.emotion || "Inget svar från AI.";
  setWeatherIcon(weather);

  const forecastResponse = await fetch(`/forecast?city=${city}`);
  const forecastData = await forecastResponse.json();
  forecastDiv.innerHTML = forecastData.map(day => `<p>${day.date}: ${day.weather}, ${day.temp}°C</p>`).join("");

  activateShareButtons(city, aiData.emotion);
  updateFavoriteCities();
  updateTopCity(city);
  updateDailyChallenge(weather);
}

// Dynamisk bakgrund och animationer
function updateBackground(weather) {
  clearEffects();
  let lowerWeather = weather.toLowerCase();
  document.body.classList.remove("sunny", "cloudy", "rainy", "snowy");

  if (lowerWeather.includes("sol") || lowerWeather.includes("clear")) {
    document.body.classList.add("sunny");
  } else if (lowerWeather.includes("moln") || lowerWeather.includes("cloud")) {
    document.body.classList.add("cloudy");
    addCloudEffect();
  } else if (lowerWeather.includes("regn") || lowerWeather.includes("rain")) {
    document.body.classList.add("rainy");
    addRainEffect();
  } else if (lowerWeather.includes("snö") || lowerWeather.includes("snow")) {
    document.body.classList.add("snowy");
    addSnowEffect();
  }
}

function clearEffects() {
  animationContainer.innerHTML = "";
  document.body.className = "";
}

function addRainEffect() {
  for (let i = 0; i < 30; i++) {
    let drop = document.createElement("div");
    drop.classList.add("rain-animation");
    drop.style.left = Math.random() * 100 + "vw";
    drop.style.animationDuration = Math.random() * 1 + 0.5 + "s";
    animationContainer.appendChild(drop);
  }
}

function addSnowEffect() {
  for (let i = 0; i < 20; i++) {
    let snowflake = document.createElement("div");
    snowflake.innerHTML = "❄";
    snowflake.classList.add("snowflake");
    snowflake.style.left = Math.random() * 100 + "vw";
    snowflake.style.fontSize = Math.random() * 1 + 1 + "rem";
    snowflake.style.animationDuration = Math.random() * 5 + 2 + "s";
    animationContainer.appendChild(snowflake);
  }
}

function addCloudEffect() {
  for (let i = 0; i < 5; i++) {
    let cloud = document.createElement("div");
    cloud.innerHTML = "☁️";
    cloud.classList.add("cloud-animation");
    cloud.style.left = Math.random() * 100 + "vw";
    cloud.style.top = Math.random() * 20 + "vh";
    cloud.style.animationDuration = Math.random() * 20 + 10 + "s";
    animationContainer.appendChild(cloud);
  }
}

function setWeatherIcon(weather) {
  weatherIcon.className = "fas";
  if (weather.includes("sol")) weatherIcon.classList.add("fa-sun");
  else if (weather.includes("moln")) weatherIcon.classList.add("fa-cloud");
  else if (weather.includes("regn")) weatherIcon.classList.add("fa-cloud-showers-heavy");
  else if (weather.includes("snö")) weatherIcon.classList.add("fa-snowflake");
  else weatherIcon.classList.add("fa-question");
}

// Sociala medier delning
function activateShareButtons(city, emotion) {
  const poeticShareText = `Vädret i ${city} viskar poesi: "${emotion}" – Upplev det med Väderpoesi!`;

  document.getElementById("shareFacebook").onclick = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(poeticShareText)}`, '_blank');
    updatePoints(20, "delade på Facebook");
  };

  document.getElementById("shareTwitter").onclick = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(poeticShareText)}`, '_blank');
    updatePoints(20, "delade på Twitter");
  };

  document.getElementById("shareInstagram").onclick = () => {
    html2canvas(document.getElementById("weatherResult")).then(canvas => {
      const link = document.createElement("a");
      link.download = "vaderpoesi.png";
      link.href = canvas.toDataURL();
      link.click();
      updatePoints(20, "delade på Instagram");
    });
  };
}

// Poängsystem
function updatePoints(amount, action) {
  userPoints += amount;
  pointsDisplay.textContent = userPoints;
  localStorage.setItem("poesiPoints", userPoints);
  console.log(`Tjänade ${amount} Poesi-droppar för att ${action}`);
}

// Favoritstäder
function updateFavoriteCities() {
  const favorites = JSON.parse(localStorage.getItem("favoriteCities") || "[]");
  favoriteCitiesDiv.innerHTML = "";
  favorites.forEach(city => {
    const div = document.createElement("div");
    div.textContent = city;
    div.classList.add("favorite-city");
    div.addEventListener("click", () => {
      cityInput.value = city;
      document.getElementById("searchButton").click();
    });
    favoriteCitiesDiv.appendChild(div);
  });
}

document.getElementById("saveFavorite").addEventListener("click", () => {
  if (!currentCity) {
    alert("Sök efter en stad först!");
    return;
  }
  const favorites = JSON.parse(localStorage.getItem("favoriteCities") || "[]");
  if (!favorites.includes(currentCity)) {
    favorites.push(currentCity);
    localStorage.setItem("favoriteCities", JSON.stringify(favorites));
    updateFavoriteCities();
    alert(`${currentCity} har sparats som favorit!`);
    updatePoints(15, "sparade en favoritstad");
  } else {
    alert("Denna stad är redan en favorit!");
  }
});

// Daglig utmaning
function updateDailyChallenge(weather) {
  const challenges = {
    sol: "Hur värmer solen ditt hjärta idag?",
    moln: "Vad döljer sig bakom dagens moln för dig?",
    regn: "Hur känns regnet mot din själ idag?",
    snö: "Vad viskar snöflingorna till dig?"
  };
  const weatherKey = Object.keys(challenges).find(key => weather.toLowerCase().includes(key)) || "default";
  document.getElementById("dailyChallenge").textContent = challenges[weatherKey] || "Hur känns dagens väder för dig?";
}

document.getElementById("submitChallenge").addEventListener("click", () => {
  const response = challengeResponse.value.trim();
  if (response) {
    console.log("Utmaningssvar:", response);
    alert("Tack för att du delade din poesi! Här är 25 Poesi-droppar.");
    updatePoints(25, "svarade på dagens utmaning");
    challengeResponse.value = "";
  } else {
    alert("Skriv något poetiskt först!");
  }
});

// Community: Dagens mest poetiska stad (mock data)
async function updateTopCity(city) {
  const storedData = JSON.parse(localStorage.getItem("cityStats") || "{}");
  storedData[city] = (storedData[city] || 0) + 1;
  localStorage.setItem("cityStats", JSON.stringify(storedData));

  const topCity = Object.entries(storedData).sort((a, b) => b[1] - a[1])[0];
  topCityDisplay.textContent = topCity ? `${topCity[0]} (${topCity[1]} sökningar)` : "Ingen data än";
}

// Feedback-formulär
document.getElementById("feedbackForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const feedback = e.target.querySelector("textarea").value;
  console.log("Feedback:", feedback);
  alert("Tack för din feedback! Här är 15 Poesi-droppar som tack.");
  updatePoints(15, "gav feedback");
  e.target.reset();
});

// Ladda initiala värden
updateFavoriteCities();
updateTopCity("");