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

languageSelect.addEventListener("change", (e) => {
  currentLanguage = e.target.value;
  updateLanguage();
});

darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

cityInput.addEventListener(
  "input",
  debounce(async () => {
    const query = cityInput.value.trim();
    if (query.length < 2) {
      autocompleteDiv.innerHTML = "";
      return;
    }
    const suggestions = await fetchCitySuggestions(query);
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

document.getElementById("searchButton").addEventListener("click", async () => {
  const city = cityInput.value.trim();
  const name = nameInput.value.trim();
  const mood = moodSelect.value;

  if (!city) {
    alert(translations[currentLanguage].errorNoCity);
    return;
  }

  loadingIndicator.style.display = "block";
  try {
    const weatherData = await (
      await fetch(`/weather?city=${encodeURIComponent(city)}`)
    ).json();
    if (!weatherData || weatherData.error) {
      alert(translations[currentLanguage].errorNoCity);
      return;
    }
    const forecastData = await (
      await fetch(`/forecast?city=${encodeURIComponent(city)}`)
    ).json();
    const aiResponse = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weather: weatherData.weather,
        temp: weatherData.temp,
        name,
        mood,
        language: currentLanguage,
      }),
    });
    const aiData = await aiResponse.json();
    weatherText.innerText = aiData.emotion;
    setWeatherIcon(weatherData.weather);
    updateBackground(weatherData.weather);
    displayForecast(forecastData);
    addWeatherAnimations(weatherData.weather);
  } catch (error) {
    console.error("Fel:", error);
    weatherText.innerText = "Ett fel uppstod, försök igen!";
  } finally {
    loadingIndicator.style.display = "none";
  }
});

document.getElementById("submitComment").addEventListener("click", async () => {
  const comment = commentInput.value.trim();
  if (comment) {
    try {
      const response = await fetch("/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      const data = await response.json();
      if (data.success) {
        loadComments();
        commentInput.value = "";
        alert("Tack för din kommentar!");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      alert("Kunde inte skicka kommentar, försök igen.");
    }
  }
});

async function loadComments() {
  try {
    const response = await fetch("/comments");
    const comments = await response.json();
    commentsDiv.innerHTML = comments
      .map(
        (c) =>
          `<div class="bg-gray-100 dark:bg-gray-700 p-2 rounded shadow-md">${c.text}</div>`
      )
      .join("");
  } catch (error) {
    console.error("Error loading comments:", error);
  }
}

loadComments();

subscribeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("subscribeEmail").value;
  try {
    const response = await fetch("/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    alert(data.message || "Tack för din prenumeration!");
    subscribeForm.reset();
  } catch (error) {
    console.error("Error subscribing:", error);
    alert("Kunde inte prenumerera, försök igen.");
  }
});

document.getElementById("geolocationButton").addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `/geocode?lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data && data.length > 0) {
            cityInput.value = data[0].name;
            document.getElementById("searchButton").click();
          } else {
            alert(translations[currentLanguage].errorNoCity);
          }
        } catch (error) {
          console.error("Fel vid hämtning av plats:", error);
          alert("Kunde inte hämta plats. Försök igen.");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert(
          "Kunde inte hämta plats. Se till att platsdelning är aktiverat."
        );
      }
    );
  } else {
    alert("Geolocation stöds inte av din webbläsare.");
  }
});

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
  });
});

document.getElementById("premiumButton").addEventListener("click", () => {
  alert(
    translations[currentLanguage].premiumDescription +
      " Klicka här för att gå till betalningssidan snart!"
  );
  // Implementera betalningsintegration (t.ex. Stripe) i framtiden
});

async function fetchCitySuggestions(query) {
  const response = await fetch(`/geocode?query=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.map((city) => ({
    name: city.name,
    country: city.country,
  }));
}

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

function updateBackground(weather) {
  document.body.className = `transition-all duration-300 ${
    weather.toLowerCase()
  }${document.body.classList.contains("dark") ? " dark" : ""}`;
}

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