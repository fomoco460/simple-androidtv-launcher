/**
 * Weather and Geocoding service using Open-Meteo (public, no API key required)
 */

export interface WeatherData {
  temperature: number; // in Celsius or Fahrenheit based on request
  condition: string;
  iconType: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'snowy' | 'thunder' | 'fog';
  cityName: string;
  high?: number;
  low?: number;
  humidity?: number;
}

export interface LocationResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string; // state/province
  country?: string;
  countryCode?: string;
}

export const POPULAR_LOCATIONS: LocationResult[] = [
  { name: 'New York', admin1: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
  { name: 'Los Angeles', admin1: 'California', country: 'United States', latitude: 34.0522, longitude: -118.2437 },
  { name: 'Chicago', admin1: 'Illinois', country: 'United States', latitude: 41.8781, longitude: -87.6298 },
  { name: 'Dallas', admin1: 'Texas', country: 'United States', latitude: 32.7767, longitude: -96.797 },
  { name: 'Miami', admin1: 'Florida', country: 'United States', latitude: 25.7617, longitude: -80.1918 },
  { name: 'London', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Toronto', admin1: 'Ontario', country: 'Canada', latitude: 43.6532, longitude: -79.3832 },
  { name: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
];

const WEATHER_CODE_MAP: Record<number, { condition: string; icon: WeatherData['iconType'] }> = {
  0: { condition: 'Clear', icon: 'sunny' },
  1: { condition: 'Mainly Clear', icon: 'partly-cloudy' },
  2: { condition: 'Partly Cloudy', icon: 'partly-cloudy' },
  3: { condition: 'Overcast', icon: 'cloudy' },
  45: { condition: 'Fog', icon: 'fog' },
  48: { condition: 'Depositing Rime Fog', icon: 'fog' },
  51: { condition: 'Light Drizzle', icon: 'rainy' },
  53: { condition: 'Moderate Drizzle', icon: 'rainy' },
  55: { condition: 'Dense Drizzle', icon: 'rainy' },
  61: { condition: 'Slight Rain', icon: 'rainy' },
  63: { condition: 'Moderate Rain', icon: 'rainy' },
  65: { condition: 'Heavy Rain', icon: 'rainy' },
  71: { condition: 'Slight Snow', icon: 'snowy' },
  73: { condition: 'Moderate Snow', icon: 'snowy' },
  75: { condition: 'Heavy Snow', icon: 'snowy' },
  80: { condition: 'Rain Showers', icon: 'rainy' },
  81: { condition: 'Moderate Showers', icon: 'rainy' },
  82: { condition: 'Violent Showers', icon: 'rainy' },
  85: { condition: 'Snow Showers', icon: 'snowy' },
  86: { condition: 'Heavy Snow Showers', icon: 'snowy' },
  95: { condition: 'Thunderstorm', icon: 'thunder' },
  96: { condition: 'Thunderstorm with Hail', icon: 'thunder' },
  99: { condition: 'Heavy Thunderstorm', icon: 'thunder' },
};

const DEFAULT_WEATHER: WeatherData = {
  temperature: 72,
  condition: 'Partly Cloudy',
  iconType: 'partly-cloudy',
  cityName: 'Local Area',
  high: 76,
  low: 58,
  humidity: 48,
};

class WeatherService {
  private cachedData: WeatherData | null = null;
  private lastFetched: number = 0;
  private lastQueryKey: string = '';

  async searchLocations(query: string): Promise<LocationResult[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query.trim()
      )}&count=6&language=en&format=json`;

      const res = await fetch(url);
      if (!res.ok) return [];

      const data = await res.json();
      if (!data.results || !Array.isArray(data.results)) return [];

      return data.results.map((item: any) => ({
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        admin1: item.admin1,
        country: item.country,
        countryCode: item.country_code,
      }));
    } catch {
      return [];
    }
  }

  async getWeather(
    unit: 'F' | 'C' = 'F',
    customLat?: number,
    customLon?: number,
    customCity?: string
  ): Promise<WeatherData> {
    const now = Date.now();
    const queryKey = `${unit}-${customLat ?? 'auto'}-${customLon ?? 'auto'}-${customCity ?? 'auto'}`;

    // Cache for 10 minutes if same query
    if (this.cachedData && this.lastQueryKey === queryKey && now - this.lastFetched < 10 * 60 * 1000) {
      return this.cachedData;
    }

    try {
      let lat = customLat ?? 34.0522;
      let lon = customLon ?? -118.2437;
      let detectedCity = customCity || (customLat ? 'Custom Location' : 'Local Area');

      // If no custom coordinates provided, attempt browser geolocation
      if (customLat === undefined || customLon === undefined) {
        if (typeof window !== 'undefined' && 'geolocation' in navigator) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 3000,
                maximumAge: 600000,
              });
            });
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
            detectedCity = 'Local Area';
          } catch {
            // Geolocation fallback
          }
        }
      }

      const tempUnitParam = unit === 'F' ? 'temperature_unit=fahrenheit' : '';
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto${
        tempUnitParam ? '&' + tempUnitParam : ''
      }`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch weather');

      const data = await res.json();
      const code = data.current?.weather_code ?? 2;
      const mapping = WEATHER_CODE_MAP[code] || { condition: 'Fair', icon: 'partly-cloudy' };

      const result: WeatherData = {
        temperature: Math.round(data.current?.temperature_2m ?? (unit === 'F' ? 72 : 22)),
        condition: mapping.condition,
        iconType: mapping.icon,
        cityName: detectedCity,
        high: data.daily?.temperature_2m_max?.[0] ? Math.round(data.daily.temperature_2m_max[0]) : undefined,
        low: data.daily?.temperature_2m_min?.[0] ? Math.round(data.daily.temperature_2m_min[0]) : undefined,
        humidity: data.current?.relative_humidity_2m,
      };

      this.cachedData = result;
      this.lastQueryKey = queryKey;
      this.lastFetched = now;
      return result;
    } catch {
      return {
        ...DEFAULT_WEATHER,
        cityName: customCity || 'Local Area',
        temperature: unit === 'F' ? 72 : 22,
        high: unit === 'F' ? 76 : 24,
        low: unit === 'F' ? 58 : 15,
      };
    }
  }
}

export const weatherService = new WeatherService();
