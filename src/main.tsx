import React from 'react';
import ReactDOM from 'react-dom/client';
import WeatherPoetryApp from './WeatherPoetryApp';
import './style.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WeatherPoetryApp />
  </React.StrictMode>
);