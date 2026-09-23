import { tool } from 'ai';
import { z } from 'zod';
import { config } from '../config.js';

/**
 * Búsqueda web con Tavily. Devuelve un resumen + fuentes.
 * Si no hay TAVILY_API_KEY configurada, la tool no se registra (ver tools/index.ts).
 */
export const buscar_web = tool({
  description:
    'Busca información ACTUAL en internet. Usar para noticias, resultados deportivos, ' +
    'precios/cotizaciones, clima de eventos actuales, o cualquier dato que pudo cambiar ' +
    'recientemente. NO usar para conocimiento general estable (historia, definiciones).',
  parameters: z.object({
    consulta: z.string().describe('La búsqueda en lenguaje natural.'),
  }),
  execute: async ({ consulta }) => {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.tavilyApiKey}`,
      },
      body: JSON.stringify({
        query: consulta,
        max_results: 5,
        search_depth: 'basic',
        include_answer: true,
      }),
    });
    if (!resp.ok) {
      return { error: `Búsqueda falló (${resp.status})` };
    }
    const data: any = await resp.json();
    return {
      resumen: data.answer ?? null,
      fuentes: (data.results ?? []).slice(0, 5).map((r: any) => ({
        titulo: r.title,
        url: r.url,
        extracto: r.content,
      })),
    };
  },
});
