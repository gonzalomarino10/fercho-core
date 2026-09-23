import { tool } from 'ai';
import { z } from 'zod';
import { pool, toVectorLiteral } from '../db.js';
import { embedText } from '../llm.js';

/**
 * Devuelve las tools de memoria ligadas a un usuario concreto.
 * Se crean por request para "capturar" el user_id sin que el modelo tenga que pasarlo.
 */
export function memoryTools(userId: string) {
  const buscar_memoria = tool({
    description:
      'Busca en la memoria personal del usuario por SIGNIFICADO (no solo palabras). ' +
      'Usar SIEMPRE que la pregunta dependa de algo que el usuario contó antes: ' +
      'personas, trabajo, gustos, planes, eventos pasados, preferencias, etc.',
    parameters: z.object({
      consulta: z
        .string()
        .describe('Qué se quiere recordar, en lenguaje natural. Ej: "dónde trabaja mi hermano".'),
    }),
    execute: async ({ consulta }) => {
      const emb = await embedText(consulta);
      const res = await pool.query(
        'SELECT * FROM buscar_memoria($1, $2::vector, $3, 6)',
        [userId, toVectorLiteral(emb), consulta],
      );
      if (res.rows.length > 0) {
        const ids = res.rows.map((r) => r.id);
        // refuerzo por uso (no bloqueante para la respuesta)
        pool.query('SELECT tocar_memorias($1::bigint[])', [ids]).catch(() => {});
      }
      return res.rows.map((r) => ({
        contenido: r.contenido,
        categoria: r.categoria,
        tipo: r.tipo,
        cuando: r.event_time,
        recordatorio: r.recordatorio_fecha,
      }));
    },
  });

  const guardar_memoria = tool({
    description:
      'Guarda un dato duradero que el usuario contó y sirva para el futuro: ' +
      'personas importantes, trabajo, gustos, decisiones, objetivos, hechos de su vida. ' +
      'NO usar para charla trivial ni para preguntas. El sistema deduplica solo.',
    parameters: z.object({
      contenido: z.string().describe('El dato a recordar, en una frase clara.'),
      categoria: z
        .string()
        .default('general')
        .describe('Ej: familia, trabajo, gustos, salud, proyectos, objetivos.'),
      tipo: z
        .enum(['recuerdo', 'preferencia', 'persona', 'objetivo', 'evento'])
        .default('recuerdo'),
      importancia: z.number().int().min(1).max(5).default(2),
    }),
    execute: async ({ contenido, categoria, tipo, importancia }) => {
      const emb = await embedText(contenido);
      const payload = {
        usuario_id: userId,
        contenido,
        categoria,
        tipo,
        importancia,
        fuente: 'fercho-core',
        estado: 'activo',
        nivel_certeza: 'confirmado',
      };
      const res = await pool.query('SELECT guardar_memoria($1::jsonb, $2::vector) AS id', [
        JSON.stringify(payload),
        toVectorLiteral(emb),
      ]);
      return { guardado: true, id: res.rows[0]?.id ?? null };
    },
  });

  return { buscar_memoria, guardar_memoria };
}
