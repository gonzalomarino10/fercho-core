import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { config } from './config.js';

/** Modelo de chat que usa el orquestador. */
export const chatModel = openai(config.model);

/** Genera el embedding de un texto con el modelo configurado (1536 dims). */
export async function embedText(texto: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding(config.embedModel),
    value: texto && texto.trim() !== '' ? texto : ' ',
  });
  return embedding;
}
