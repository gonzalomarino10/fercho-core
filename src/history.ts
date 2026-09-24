import { pool } from './db.js';

export type Turn = { role: 'user' | 'assistant'; content: string };

/** Trae los últimos turnos de la conversación de un usuario (orden cronológico). */
export async function getHistory(userId: string, limit = 10): Promise<Turn[]> {
  const res = await pool.query(
    `SELECT rol, contenido FROM fercho_conversaciones
      WHERE usuario_id = $1
      ORDER BY creado_en DESC
      LIMIT $2`,
    [userId, limit],
  );
  return res.rows
    .reverse()
    .map((r) => ({
      role: r.rol === 'assistant' ? 'assistant' : 'user',
      content: r.contenido,
    }));
}

/** Guarda el turno del usuario y la respuesta de Fercho. No bloquea la respuesta. */
export async function saveTurns(
  userId: string,
  userMsg: string,
  assistantMsg: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO fercho_conversaciones (usuario_id, rol, contenido)
     VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
    [userId, userMsg, assistantMsg],
  );
}
