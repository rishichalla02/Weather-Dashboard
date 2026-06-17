const WEATHER_API_KEY = CONFIG.WEATHER_API_KEY;
const MAX_HISTORY_COUNT = 6;

const DOM = {
    searchForm: document.getElementById('search-form'),
    cityInput: document.getElementById('city-input'),
    recentSearchesList: document.getElementById('recent-searches-list'),
    themeToggle: document.getElementById('theme-toggle'),
    dateTimeDisplay: document.getElementById('date-time-display'),
    
    loadingSpinner: document.getElementById('loading-spinner'),
    errorMessage: document.getElementById('error-message'),
    errorText: document.getElementById('error-text'),
    weatherPlaceholder: document.getElementById('weather-placeholder'),
    weatherContent: document.getElementById('weather-content'),
    
    cityName: document.getElementById('city-name'),
    weatherDescription: document.getElementById('weather-description'),
    weatherIcon: document.getElementById('weather-icon'),
    currentTemperature: document.getElementById('current-temperature'),
    humidityValue: document.getElementById('humidity-value'),
    windSpeedValue: document.getElementById('wind-speed-value')
};

let searchHistory = [];

function runLiveClock() {
    const updateTime = () => {
        const now = new Date();
        const formattingConfig = { 
            weekday: 'short', 
            day: '2-digit', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        };
        DOM.dateTimeDisplay.textContent = now.toLocaleString('en-US', formattingConfig);
    };
    updateTime();
    setInterval(updateTime, 1000);
}

function routeUiState(targetState) {
    DOM.weatherPlaceholder.classList.add('hidden');
    DOM.loadingSpinner.classList.add('hidden');
    DOM.errorMessage.classList.add('hidden');
    DOM.weatherContent.classList.add('hidden');

    switch(targetState) {
        case 'PLACEHOLDER':
            DOM.weatherPlaceholder.classList.remove('hidden');
            break;
        case 'LOADING':
            DOM.loadingSpinner.classList.remove('hidden');
            break;
        case 'ERROR':
            DOM.errorMessage.classList.remove('hidden');
            break;
        case 'CONTENT':
            DOM.weatherContent.classList.remove('hidden');
            break;
    }
}

async function fetchWeatherData(targetCity) {
    if (!targetCity || targetCity.trim() === "") return;
    
    routeUiState('LOADING');
    
    const targetUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(targetCity.trim())}&units=metric&appid=${WEATHER_API_KEY}`;
    
    try {
        const httpResponse = await fetch(targetUrl);
        
        if (!httpResponse.ok) {
            if (httpResponse.status === 404) {
                throw new Error("City not found in database. Please verify name spelling.");
            } else if (httpResponse.status === 401) {
                throw new Error("Invalid API Credentials. Please check configuration rules.");
            } else {
                throw new Error(`Server returned unexpected issue: (Status Code ${httpResponse.status})`);
            }
        }
        
        const telemetryPayload = await httpResponse.json();
        
        renderWeatherToDashboard(telemetryPayload);
        updateHistoryRecords(telemetryPayload.name, telemetryPayload.sys.country);
        
    } catch (caughtError) {
        DOM.errorText.textContent = caughtError.message || "Network execution connection failure occurred.";
        routeUiState('ERROR');
    }
}

function renderWeatherToDashboard(data) {
    DOM.cityName.textContent = `${data.name}, ${data.sys.country}`;
    DOM.weatherDescription.textContent = data.weather[0].description;
    DOM.currentTemperature.textContent = `${Math.round(data.main.temp)}°C`;
    DOM.humidityValue.textContent = `${data.main.humidity}%`;
    DOM.windSpeedValue.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`; // Converts m/s to km/h
    
    const iconCode = data.weather[0].icon;
    DOM.weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    DOM.weatherIcon.alt = data.weather[0].main;

    routeUiState('CONTENT');
}

function initializeHistoryCache() {
    const cachedData = localStorage.getItem('astra_weather_history');
    if (cachedData) {
        try {
            searchHistory = JSON.parse(cachedData);
            renderHistoryInterface();
        } catch(e) {
            searchHistory = [];
        }
    }
}

function updateHistoryRecords(cityName, countryCode) {
    const uniqueString = `${cityName}, ${countryCode}`;
    
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== uniqueString.toLowerCase());
    searchHistory.unshift(uniqueString);

    if (searchHistory.length > MAX_HISTORY_COUNT) {
        searchHistory.pop();
    }
    
    localStorage.setItem('astra_weather_history', JSON.stringify(searchHistory));
    renderHistoryInterface();
}

function renderHistoryInterface() {
    DOM.recentSearchesList.innerHTML = "";
    
    if (searchHistory.length === 0) {
        DOM.recentSearchesList.innerHTML = `<p class="history-item-empty" style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No search entries logged</p>`;
        return;
    }
    
    searchHistory.forEach(historyLabel => {
        const itemButton = document.createElement('button');
        itemButton.className = 'history-item';
        itemButton.type = 'button';
        itemButton.innerHTML = `<span>${historyLabel}</span><i class="fas fa-history"></i>`;
        itemButton.addEventListener('click', () => {
            DOM.cityInput.value = historyLabel;
            fetchWeatherData(historyLabel);
        });
        
        DOM.recentSearchesList.appendChild(itemButton);
    });
}

function setupThemeManager() {
    const savedTheme = localStorage.getItem('astra_weather_theme');
    const systemPreferencesDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPreferencesDark)) {
        document.body.classList.add('dark-theme');
        DOM.themeToggle.innerHTML = `<i class="fas fa-sun"></i>`;
    } else {
        document.body.classList.remove('dark-theme');
        DOM.themeToggle.innerHTML = `<i class="fas fa-moon"></i>`;
    }

    DOM.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const processingDarkState = document.body.classList.contains('dark-theme');
        
        localStorage.setItem('astra_weather_theme', processingDarkState ? 'dark' : 'light');
        DOM.themeToggle.innerHTML = processingDarkState ? `<i class="fas fa-sun"></i>` : `<i class="fas fa-moon"></i>`;
    });
}

function bindApplicationEvents() {
    DOM.searchForm.addEventListener('submit', (formEvent) => {
        formEvent.preventDefault();
        const inputString = DOM.cityInput.value;
        fetchWeatherData(inputString);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    runLiveClock();
    initializeHistoryCache();
    setupThemeManager();
    bindApplicationEvents();
});