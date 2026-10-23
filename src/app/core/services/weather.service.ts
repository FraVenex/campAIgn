import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, map } from 'rxjs';

export interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    weatherCode: number;
    time: string;
    apparentTemperature?: number;
    windDirection?: number;
    windGusts?: number;
    dewPoint?: number;
    cloudCover?: number;
    pressure?: number;
  };
  /** Indice del giorno corrente negli array daily (la risposta include anche ieri). */
  todayIndex: number;
  daily: {
    dates: string[];
    maxTemps: number[];
    minTemps: number[];
    precipSums: number[];
    windSpeeds: number[];
    weatherCodes: number[];
    et0?: number[];
    soilTemp?: number[];
    sunrise?: string[];
    sunset?: string[];
    precipProbability?: number[];
    uvIndex?: number[];
    sunshineHours?: number[];
    windGusts?: number[];
    windDirection?: number[];
  };
  hourly: {
    time: string[];
    temperature: number[];
    humidity: number[];
    windSpeed: number[];
    soilTemp: number[];
    soilMoisture?: number[];
    vpd?: number[];
    dewPoint?: number[];
    precipProbability?: number[];
    precipitation?: number[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private http = inject(HttpClient);
  private apiUrl = 'https://api.open-meteo.com/v1/forecast';
  private cache = new Map<string, { at: number; data: Promise<WeatherData> }>();

  /** Variante con cache (15 minuti) usata da home, meteo, mappe e Arnaldo. */
  getWeatherCached(lat: number, lon: number, force = false): Promise<WeatherData> {
    const key = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const hit = this.cache.get(key);
    if (!force && hit && Date.now() - hit.at < 15 * 60 * 1000) return hit.data;
    const data = firstValueFrom(this.getWeather(lat, lon));
    data.catch(() => this.cache.delete(key));
    this.cache.set(key, { at: Date.now(), data });
    return data;
  }

  getWeather(lat: number, lon: number): Observable<WeatherData> {
    const params = {
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,apparent_temperature,wind_direction_10m,wind_gusts_10m,dew_point_2m,cloud_cover,surface_pressure',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code,et0_fao_evapotranspiration,sunrise,sunset,precipitation_probability_max,uv_index_max,sunshine_duration,wind_gusts_10m_max,wind_direction_10m_dominant',
      hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,soil_temperature_6cm,soil_moisture_3_to_9cm,vapour_pressure_deficit,dew_point_2m,precipitation_probability,precipitation',
      timezone: 'auto',
      past_days: 1,
      forecast_days: 7
    };

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        // Estraiamo la temperatura del suolo a mezzogiorno per ogni giorno (dai soli giorni di forecast o inclusi past?)
        // Open-Meteo restituisce hourly per tutto l'intervallo (past_days + forecast_days)
        const hourlySoilTemp = res.hourly.soil_temperature_6cm;
        const dailySoilTemp: number[] = [];
        
        // Cerchiamo l'indice che corrisponde all'inizio del forecast (oggi)
        // In genere res.daily.time[0] è oggi.
        const now = new Date();
        const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const foundToday = (res.daily.time as string[]).indexOf(localToday);
        const todayIndex = foundToday >= 0 ? foundToday : Math.min(1, res.daily.time.length - 1);
        const todayDate = res.daily.time[0];
        const startIndex = res.hourly.time.findIndex((t: string) => t.startsWith(todayDate));

        for (let i = 0; i < res.daily.time.length; i++) {
          const noonIndex = startIndex + (i * 24) + 12;
          dailySoilTemp.push(hourlySoilTemp[noonIndex] || hourlySoilTemp[startIndex + (i * 24)] || 0);
        }

        return {
          current: {
            temperature: res.current.temperature_2m,
            humidity: res.current.relative_humidity_2m,
            precipitation: res.current.precipitation,
            windSpeed: res.current.wind_speed_10m,
            weatherCode: res.current.weather_code,
            time: res.current.time,
            apparentTemperature: res.current.apparent_temperature,
            windDirection: res.current.wind_direction_10m,
            windGusts: res.current.wind_gusts_10m,
            dewPoint: res.current.dew_point_2m,
            cloudCover: res.current.cloud_cover,
            pressure: res.current.surface_pressure
          },
          todayIndex,
          daily: {
            dates: res.daily.time,
            maxTemps: res.daily.temperature_2m_max,
            minTemps: res.daily.temperature_2m_min,
            precipSums: res.daily.precipitation_sum,
            windSpeeds: res.daily.wind_speed_10m_max,
            weatherCodes: res.daily.weather_code,
            et0: res.daily.et0_fao_evapotranspiration,
            soilTemp: dailySoilTemp,
            sunrise: res.daily.sunrise,
            sunset: res.daily.sunset,
            precipProbability: res.daily.precipitation_probability_max,
            uvIndex: res.daily.uv_index_max,
            sunshineHours: (res.daily.sunshine_duration || []).map((sec: number) => Math.round((sec / 3600) * 10) / 10),
            windGusts: res.daily.wind_gusts_10m_max,
            windDirection: res.daily.wind_direction_10m_dominant
          },
          hourly: {
            time: res.hourly.time,
            temperature: res.hourly.temperature_2m,
            humidity: res.hourly.relative_humidity_2m,
            windSpeed: res.hourly.wind_speed_10m,
            soilTemp: res.hourly.soil_temperature_6cm,
            soilMoisture: res.hourly.soil_moisture_3_to_9cm,
            vpd: res.hourly.vapour_pressure_deficit,
            dewPoint: res.hourly.dew_point_2m,
            precipProbability: res.hourly.precipitation_probability,
            precipitation: res.hourly.precipitation
          }
        };
      })
    );
  }
}
