import type { ToolSet } from 'ai';
import { config } from '../config.js';
import { memoryTools } from './memory.js';
import { buscar_web } from './web.js';
import { clima } from './weather.js';

/**
 * Registro de herramientas. Se arma por request porque las tools de memoria
 * necesitan el user_id. Acá es donde, más adelante, se agregan nuevos providers
 * (calendar, gmail, finanzas/IOL, imágenes) sin tocar el orquestador.
 */
export function buildTools(userId: string): ToolSet {
  const tools: ToolSet = {
    ...memoryTools(userId),
    clima,
  };
  // La búsqueda web solo se ofrece si hay API key configurada.
  if (config.tavilyApiKey) {
    tools.buscar_web = buscar_web;
  }
  return tools;
}
