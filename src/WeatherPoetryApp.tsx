import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import { SunIcon, CloudIcon, CloudRainIcon, SnowflakeIcon, TwitterIcon, FacebookIcon, InstagramIcon, MapPinIcon, MoonIcon } from "lucide-react";
import AdSlot from "./components/ui/Adslot"; // Add this line to import AdSlot

// Definiera typer för språk och översättningar
type Language = 'sv' | 'en';

type Translation = {
  title: string;
  placeholderName: string;
  placeholderCity: string;
  moodSelect: string;
  moodOptions: string[];
  searchButton: string;
  geolocationButton: string;
  loading: string;
  commentsTitle: string;
  commentPlaceholder: string;
  submitComment: string;
  forecastTitle: string;
  errorNoCity: string;
};

type Translations = {
  [key in Language]: Translation;
};

// Definiera typer för stadförslag, prognos och kommentarer
type CitySuggestion = {
  name: string;
  country: string;
};

type ForecastDay = {
  date: string;
  temp: number;
  icon: JSX.Element;
};

type Comment = {
  id: string;
  text: string;
  timestamp: string;
};

const WeatherPoetryApp = () => {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState<Language>('sv');
  const [poetry, setPoetry] = useState('');
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [email, setEmail] = useState(''); // Ny state för mailprenumeration
  const cityInputRef = useRef<HTMLDivElement>(null);

  // Språk och översättningar
  const translations: Translations = {
    sv: {
      title: "Väderpoesi – Upplev vädret med poesi",
      placeholderName: "Ditt namn (för personlig poesi)",
      placeholderCity: "Skriv in din stad...",
      moodSelect: "Välj humör (valfritt)",
      moodOptions: ["Glad", "Melankolisk", "Inspirerad", "Romantisk", "Energisk"],
      searchButton: "Upplev vädret",
      geolocationButton: "Min plats",
      loading: "Laddar...",
      commentsTitle: "Dela dina tankar",
      commentPlaceholder: "Skriv din kommentar...",
      submitComment: "Skicka kommentar",
      forecastTitle: `5-dagars prognos i ${city}`,
      errorNoCity: "Vänligen ange en stad!"
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
      submitComment: "Submit comment",
      forecastTitle: `5-day forecast in ${city}`,
      errorNoCity: "Please enter a city!"
    }
  };

  const countryNames: { [key: string]: { sv: string; en: string } } = {
    US: { sv: "USA", en: "United States" },
    CA: { sv: "Kanada", en: "Canada" },
    GB: { sv: "Storbritannien", en: "United Kingdom" },
    FR: { sv: "Frankrike", en: "France" },
    DE: { sv: "Tyskland", en: "Germany" },
    IT: { sv: "Italien", en: "Italy" },
    ES: { sv: "Spanien", en: "Spain" },
    AU: { sv: "Australien", en: "Australia" },
    BR: { sv: "Brasilien", en: "Brazil" },
    CN: { sv: "Kina", en: "China" },
    IN: { sv: "Indien", en: "India" },
    JP: { sv: "Japan", en: "Japan" },
    MX: { sv: "Mexiko", en: "Mexico" },
    RU: { sv: "Ryssland", en: "Russia" },
    ZA: { sv: "Sydafrika", en: "South Africa" },
    AR: { sv: "Argentina", en: "Argentina" },
    BE: { sv: "Belgien", en: "Belgium" },
    CH: { sv: "Schweiz", en: "Switzerland" },
    CL: { sv: "Chile", en: "Chile" },
    CO: { sv: "Colombia", en: "Colombia" },
    DK: { sv: "Danmark", en: "Denmark" },
    EG: { sv: "Egypten", en: "Egypt" },
    FI: { sv: "Finland", en: "Finland" },
    GR: { sv: "Grekland", en: "Greece" },
    HK: { sv: "Hongkong", en: "Hong Kong" },
    ID: { sv: "Indonesien", en: "Indonesia" },
    IE: { sv: "Irland", en: "Ireland" },
    IL: { sv: "Israel", en: "Israel" },
    KR: { sv: "Sydkorea", en: "South Korea" },
    MY: { sv: "Malaysia", en: "Malaysia" },
    NL: { sv: "Nederländerna", en: "Netherlands" },
    NO: { sv: "Norge", en: "Norway" },
    NZ: { sv: "Nya Zeeland", en: "New Zealand" },
    PH: { sv: "Filippinerna", en: "Philippines" },
    PK: { sv: "Pakistan", en: "Pakistan" },
    PL: { sv: "Polen", en: "Poland" },
    PT: { sv: "Portugal", en: "Portugal" },
    RO: { sv: "Rumänien", en: "Romania" },
    SA: { sv: "Saudiarabien", en: "Saudi Arabia" },
    SE: { sv: "Sverige", en: "Sweden" },
    SG: { sv: "Singapore", en: "Singapore" },
    TH: { sv: "Thailand", en: "Thailand" },
    TR: { sv: "Turkiet", en: "Turkey" },
    TW: { sv: "Taiwan", en: "Taiwan" },
    UA: { sv: "Ukraina", en: "Ukraine" },
    VN: { sv: "Vietnam", en: "Vietnam" },
    AT: { sv: "Österrike", en: "Austria" },
    BD: { sv: "Bangladesh", en: "Bangladesh" },
    CZ: { sv: "Tjeckien", en: "Czech Republic" },
    HU: { sv: "Ungern", en: "Hungary" },
    IR: { sv: "Iran", en: "Iran" },
    KE: { sv: "Kenya", en: "Kenya" },
    MA: { sv: "Marocko", en: "Morocco" },
    NG: { sv: "Nigeria", en: "Nigeria" },
    PE: { sv: "Peru", en: "Peru" },
    SK: { sv: "Slovakien", en: "Slovakia" },
    VE: { sv: "Venezuela", en: "Venezuela" },
    AE: { sv: "Förenade Arabemiraten", en: "United Arab Emirates" },
    AF: { sv: "Afghanistan", en: "Afghanistan" },
    AL: { sv: "Albanien", en: "Albania" },
    AM: { sv: "Armenien", en: "Armenia" },
    AZ: { sv: "Azerbajdzjan", en: "Azerbaijan" },
    BA: { sv: "Bosnien och Hercegovina", en: "Bosnia and Herzegovina" },
    BG: { sv: "Bulgarien", en: "Bulgaria" },
    BO: { sv: "Bolivia", en: "Bolivia" },
    BY: { sv: "Vitryssland", en: "Belarus" },
    CR: { sv: "Costa Rica", en: "Costa Rica" },
    CU: { sv: "Kuba", en: "Cuba" },
    DO: { sv: "Dominikanska republiken", en: "Dominican Republic" },
    EC: { sv: "Ecuador", en: "Ecuador" },
    EE: { sv: "Estland", en: "Estonia" },
    ET: { sv: "Etiopien", en: "Ethiopia" },
    GE: { sv: "Georgien", en: "Georgia" },
    GH: { sv: "Ghana", en: "Ghana" },
    GT: { sv: "Guatemala", en: "Guatemala" },
    HN: { sv: "Honduras", en: "Honduras" },
    HR: { sv: "Kroatien", en: "Croatia" },
    IS: { sv: "Island", en: "Iceland" },
    JM: { sv: "Jamaica", en: "Jamaica" },
    JO: { sv: "Jordanien", en: "Jordan" },
    KZ: { sv: "Kazakstan", en: "Kazakhstan" },
    KW: { sv: "Kuwait", en: "Kuwait" },
    LB: { sv: "Libanon", en: "Lebanon" },
    LT: { sv: "Litauen", en: "Lithuania" },
    LV: { sv: "Lettland", en: "Latvia" },
    MD: { sv: "Moldavien", en: "Moldova" },
    MK: { sv: "Nordmakedonien", en: "North Macedonia" },
    MT: { sv: "Malta", en: "Malta" },
    MU: { sv: "Mauritius", en: "Mauritius" },
    MZ: { sv: "Moçambique", en: "Mozambique" },
    NI: { sv: "Nicaragua", en: "Nicaragua" },
    OM: { sv: "Oman", en: "Oman" },
    PA: { sv: "Panama", en: "Panama" },
    PY: { sv: "Paraguay", en: "Paraguay" },
    QA: { sv: "Qatar", en: "Qatar" },
    RS: { sv: "Serbien", en: "Serbia" },
    SI: { sv: "Slovenien", en: "Slovenia" },
    SN: { sv: "Senegal", en: "Senegal" },
    SV: { sv: "El Salvador", en: "El Salvador" },
    TZ: { sv: "Tanzania", en: "Tanzania" },
    UY: { sv: "Uruguay", en: "Uruguay" },
    ZM: { sv: "Zambia", en: "Zambia" },
  };

  // Hantera mörkt läge
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Hämta kommentarer vid uppstart
  useEffect(() => {
    const loadComments = async () => {
      try {
        const response = await fetch("/api/comments");
        if (!response.ok) {
          throw new Error(`Fel vid hämtning av kommentarer: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setComments(data);
      } catch (error) {
        console.error("Fel vid hämtning av kommentarer:", (error as Error).message);
      }
    };
    loadComments();
  }, []);

  // Autocomplete för städer
  const fetchCitySuggestions = async (query: string) => {
    if (query.length < 2) {
      setCitySuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP-fel: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setCitySuggestions(data.map((city: { name: string; country: string }) => ({
        name: city.name,
        country: city.country,
      })));
      setShowSuggestions(true);
    } catch (error) {
      console.error("Fel vid hämtning av stadförslag:", (error as Error).message);
      setCitySuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCity(value);
    fetchCitySuggestions(value);
  };

  const handleCitySelect = (selectedCity: CitySuggestion) => {
    setCity(`${selectedCity.name},${selectedCity.country}`);
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cityInputRef.current && !(cityInputRef.current as HTMLDivElement).contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Hämta väderdata och generera poesi
  const handleGenerate = async () => {
    if (!city) {
      alert(translations[language].errorNoCity);
      return;
    }
    setLoading(true);
    try {
      const weatherResponse = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      if (!weatherResponse.ok) {
        throw new Error(`Fel vid väderhämtning: ${weatherResponse.status} ${weatherResponse.statusText}`);
      }
      const weatherData = await weatherResponse.json();
      if (weatherData.error) {
        throw new Error(weatherData.error);
      }
  
      // Remove the redundant forecast fetch
      // const forecastResponse = await fetch(`/api/forecast?city=${encodeURIComponent(city)}`);
      // const forecastData = await forecastResponse.json();

      console.log("Sending language:", language);
      const aiResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weather: weatherData.weather,
          temp: weatherData.temp,
          name: name.trim(),
          mood: mood,
          language: language,
          city: city // Include city here
        }),
      });
      if (!aiResponse.ok) {
        console.error(`Fel vid anrop till Groq API: ${aiResponse.status} ${aiResponse.statusText}`);
        const errorText = await aiResponse.text();
        console.error("Groq API-svar:", errorText);
        throw new Error(`Groq API-fel: ${aiResponse.statusText}`);
      }
      const aiData = await aiResponse.json();
      if (aiData.error) {
        throw new Error(aiData.error);
      }
  
      setPoetry(aiData.emotion);
  
      // Fetch forecast separately only for display purposes
      const forecastResponse = await fetch(`/api/forecast?city=${encodeURIComponent(city)}`);
      if (!forecastResponse.ok) {
        throw new Error(`Fel vid prognoshämtning: ${forecastResponse.status} ${forecastResponse.statusText}`);
      }
      const forecastData = await forecastResponse.json();
      setForecast(forecastData.map((day: { date: string; weather: string; temp: number }) => ({
        date: new Date(day.date).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-US', { day: 'numeric', month: 'numeric', year: 'numeric' }),
        temp: day.temp,
        icon: getWeatherIcon(day.weather),
      })));
    } catch (error) {
      console.error("Fel vid vädersökning:", (error as Error).message);
      alert("Ett fel uppstod vid hämtning av väderdata. Kontrollera stadens namn och försök igen.");
    } finally {
      setLoading(false);
    }
  };

  // Geolokalisering
  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert("Geolokalisering stöds inte av din webbläsare.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          if (!response.ok) {
            throw new Error(`Fel vid platsupphämtning: ${response.status} ${response.statusText}`);
          }
          const data = await response.json();
          if (data && data.length > 0) {
            setCity(`${data[0].name},${data[0].country}`);
            handleGenerate();
          } else {
            alert(translations[language].errorNoCity);
          }
        } catch (error) {
          console.error("Fel vid platsupphämtning:", (error as Error).message);
          alert("Kunde inte hämta plats. Försök igen.");
        }
      },
      (error) => {
        console.error("Geolokalisering nekad:", error.message);
        alert("Tillåt platsåtkomst i webbläsaren för att använda denna funktion.");
      }
    );
  };

  // Skicka kommentar
  const handleSubmitComment = async () => {
    if (!commentInput.trim()) {
      alert("Vänligen skriv en kommentar innan du skickar.");
      return;
    }
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentInput.trim() }),
      });
      if (!response.ok) {
        throw new Error(`Fel vid kommentarsskicka: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setComments([{
          id: data.id,
          text: commentInput.trim(),
          timestamp: new Date().toISOString()
        }, ...comments]);
        setCommentInput('');
        alert("Tack för din kommentar!");
      }
    } catch (error) {
      console.error("Fel vid kommentarsskicka:", (error as Error).message);
      alert("Kunde inte skicka kommentar, försök igen.");
    }
  };

  // Välj väderikon
  const getWeatherIcon = (weather: string) => {
    switch (weather.toLowerCase()) {
      case 'clear':
        return <SunIcon className="w-8 h-8 text-yellow-500" />;
      case 'clouds':
        return <CloudIcon className="w-8 h-8 text-blue-500" />;
      case 'rain':
        return <CloudRainIcon className="w-8 h-8 text-blue-600" />;
      case 'snow':
        return <SnowflakeIcon className="w-8 h-8 text-blue-300" />;
      default:
        return <CloudIcon className="w-8 h-8 text-blue-500" />;
    }
  };

  // Prenumerera på nyhetsbrev
  const handleSubscribe = async () => {
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Tack för att du prenumererar!");
        setEmail(""); // Rensa fältet
      } else {
        alert(data.error || "Något gick fel vid prenumerationen.");
      }
    } catch (error) {
      console.error("Fel vid prenumeration:", (error as Error).message);
      alert("Kunde inte prenumerera, försök igen.");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          {translations[language].title}
        </CardTitle>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => setDarkMode(!darkMode)}>
            <MoonIcon className="w-5 h-5" />
          </Button>
          <Select onValueChange={(value: string) => setLanguage(value as Language)} value={language}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Språk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sv">🇸🇪 Svenska</SelectItem>
              <SelectItem value="en">🇺🇸 English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Input-sektion */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-5 gap-4 relative">
            <Input 
              placeholder={translations[language].placeholderName} 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="md:col-span-1"
            />
            <div className="md:col-span-1 relative" ref={cityInputRef}>
              <Input 
                placeholder={translations[language].placeholderCity} 
                value={city}
                onChange={handleCityChange}
              />
              {showSuggestions && citySuggestions.length > 0 && (
                <div className="absolute z-[1000] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 w-full max-h-60 overflow-y-auto">
                  {citySuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleCitySelect(suggestion)}
                    >
                      {suggestion.name}, {suggestion.country}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Select onValueChange={setMood}>
              <SelectTrigger className="md:col-span-1">
                <SelectValue placeholder={translations[language].moodSelect} />
              </SelectTrigger>
              <SelectContent>
                {translations[language].moodOptions.map(mood => (
                  <SelectItem key={mood} value={mood.toLowerCase()}>{mood}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleGenerate}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 md:col-span-1"
            >
              {loading ? translations[language].loading : translations[language].searchButton}
            </Button>
            <Button 
              onClick={handleGeolocation}
              className="bg-green-600 hover:bg-green-700 md:col-span-1"
            >
              <MapPinIcon className="mr-2 w-5 h-5" />
              {translations[language].geolocationButton}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Poesi-visning */}
      {poetry && (
        <Card className="bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              <CloudIcon className="w-12 h-12 text-blue-500" />
              <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {poetry}
              </p>
            </div>
            <div className="flex space-x-4">
              <Button variant="outline" className="hover:bg-blue-50">
                <FacebookIcon className="mr-2 text-blue-600" /> Dela
              </Button>
              <Button variant="outline" className="hover:bg-blue-50">
                <TwitterIcon className="mr-2 text-sky-500" /> Tweet
              </Button>
              <Button variant="outline" className="hover:bg-pink-50">
                <InstagramIcon className="mr-2 text-pink-600" /> Dela
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* First Ad Slot */}
    <AdSlot
      adContent={`
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=YOUR_ADSENSE_CLIENT_ID" crossorigin="anonymous"></script>
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="YOUR_ADSENSE_CLIENT_ID"
             data-ad-slot="YOUR_AD_SLOT_ID"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      `}
      width="100%"
      height="auto"
    />

      {/* 5-dagars prognos */}
      {forecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{translations[language].forecastTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {forecast.map((day, index) => (
                <div
                key={index}
                className="flex flex-col items-center p-4 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 hover:shadow-md transition-all duration-200"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">{day.date}</p>
                {day.icon}
                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{day.temp}°C</p>
              </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kommentarssektion */}
      <Card>
        <CardHeader>
          <CardTitle>{translations[language].commentsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder={translations[language].commentPlaceholder} 
            className="mb-4"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
          />
          <Button onClick={handleSubmitComment}>
            {translations[language].submitComment}
          </Button>
          <div className="mt-4 space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="bg-gray-100 dark:bg-gray-700 p-2 rounded shadow-md">
                {comment.text}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Second Ad Slot */}
    <AdSlot
      adContent={`
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=YOUR_ADSENSE_CLIENT_ID" crossorigin="anonymous"></script>
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="YOUR_ADSENSE_CLIENT_ID"
             data-ad-slot="YOUR_SECOND_AD_SLOT_ID"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      `}
      width="100%"
      height="auto"
    />

      {/* Prenumerationssektion */}
      <Card>
        <CardHeader>
          <CardTitle>Prenumerera på vårt nyhetsbrev</CardTitle>
        </CardHeader>
        <CardContent>
          <Input 
            placeholder="Din e-postadress" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4"
          />
          <Button onClick={handleSubscribe}>
            Prenumerera
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherPoetryApp;