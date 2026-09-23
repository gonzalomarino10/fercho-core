import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Falta la variable de entorno ${name} (revisá tu .env)`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  apiToken: required('FERCHO_API_TOKEN'),
  databaseUrl: required('DATABASE_URL'),
  openaiApiKey: required('OPENAI_API_KEY'),
  model: process.env.FERCHO_MODEL ?? 'gpt-4.1-mini',
  embedModel: process.env.FERCHO_EMBED_MODEL ?? 'text-embedding-3-small',
  tavilyApiKey: process.env.TAVILY_API_KEY ?? '',
  timezone: process.env.TZ ?? 'America/Argentina/Buenos_Aires',
} as const;

// El SDK de OpenAI lee OPENAI_API_KEY del entorno; nos aseguramos de que esté.
process.env.OPENAI_API_KEY = config.openaiApiKey;
