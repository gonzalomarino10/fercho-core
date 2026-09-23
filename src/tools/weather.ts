import { tool } from 'ai';
import { z } from 'zod';

// Open-Meteo: sin API key. Geocoding + forecast.
const WMO: Record<number, string> = {
  0: 'despejado', 1: 'mayormente despejado', 2: 'parcialmente nublado', 3: 'nublado',
  45: 'niebla', 48: 'niebla con escarcha', 51: 'llovizna leve', 53: 'llovizna',
  55: 'llovizna intensa', 61: 'lluvia leve', 63: 'lluvia', 65: 'lluvia fuerte',
  71: 'nieve leve', 73: 'nieve', 75: 'nieve fuerte', 80: 'chaparrones',
  81: 'chaparrones', 82: 'chaparrones fuertes', 95: 'tormenta', 96: 'tormenta con granizo',
  99: 'tormenta fuerte con granizo',
};

export const clima = tool({
  description:
    'Clima actual y pronóstico del día para una ciudad. Usar para preguntas de tiempo, ' +
    'temperatura o si conviene abrigarse/llevar paraguas.',
  parameters: z.object({
    ciudad: z.string().describe('Nombre de la ciudad. Ej: "Buenos Aires", "Vicente López".'),
  }),
  execute: async ({ ciudad }) => {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        ciudad,
      )}&count=1&language=es&format=json`,
    ).then((r) => r.json() as any);

    const loc = geo?.results?.[0];
    if (!loc) return { error: `No encontré la ciudad "${ciudad}".` };

    const fc = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
        `&current=temperature_2m,apparent_temperature,weather_code` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=auto`,
    ).then((r) => r.json() as any);

    const code = fc?.current?.weather_code;
    return {
      ciudad: `${loc.name}, ${loc.country ?? ''}`.trim(),
      ahora: {
        temp: fc?.current?.temperature_2m,
        sensacion: fc?.current?.apparent_temperature,
        cielo: WMO[code] ?? 'desconocido',
      },
      hoy: {
        max: fc?.daily?.temperature_2m_max?.[0],
        min: fc?.daily?.temperature_2m_min?.[0],
        prob_lluvia: fc?.daily?.precipitation_probability_max?.[0],
      },
    };
  },
});
