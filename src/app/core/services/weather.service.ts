import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    weatherCode: number;
    time: string;
  };
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
  };
  hourly: {
    time: string[];
    temperature: number[];
    humidity: number[];
    windSpeed: number[];
    soilTemp: number[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private http = inject(HttpClient);
  private apiUrl = 'https://api.open-meteo.com/v1/forecast';

  getWeather(lat: number, lon: number): Observable<WeatherData> {
    const params = {
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code,et0_fao_evapotranspiration,sunrise,sunset',
      hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,soil_temperature_6cm',
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
            time: res.current.time
          },
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
            sunset: res.daily.sunset
          },
          hourly: {
            time: res.hourly.time,
            temperature: res.hourly.temperature_2m,
            humidity: res.hourly.relative_humidity_2m,
            windSpeed: res.hourly.wind_speed_10m,
            soilTemp: res.hourly.soil_temperature_6cm
          }
        };
      })
    );
  }
}
