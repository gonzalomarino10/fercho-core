import pg from 'pg';
import { config } from './config.js';

// Un solo pool para toda la app. Reusa conexiones a tu Postgres existente.
export const pool = new pg.Pool({ connectionString: config.databaseUrl });

pool.on('error', (err) => {
  console.error('[db] error inesperado en el pool de Postgres:', err.message);
});

/** Helper: convierte un array de floats al literal que espera pgvector: '[0.1,0.2,...]' */
export function toVectorLiteral(embedding: number[]): string {
  return '[' + embedding.join(',') + ']';
}

/** Chequeo de salud: valida conexión y que existan las funciones de memoria. */
export async function dbHealth(): Promise<{ ok: boolean; funciones: string[] }> {
  const res = await pool.query<{ proname: string }>(
    `SELECT proname FROM pg_proc
      WHERE proname IN ('buscar_memoria','guardar_memoria','tocar_memorias')`,
  );
  const funciones = res.rows.map((r) => r.proname);
  return { ok: funciones.length === 3, funciones };
}
