import { tool } from 'ai';
import { z } from 'zod';
import { pool } from '../db.js';

const TZ = 'America/Argentina/Buenos_Aires';

/** Fecha 'YYYY-MM-DD' en zona Argentina, con un offset de días opcional. */
function arDateStr(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Tools de agenda: crear recordatorios y consultarlos por FECHA (no por significado).
 * Es lo confiable para "¿qué tengo hoy/mañana?" y para "recordame X".
 */
export function agendaTools(userId: string) {
  const agenda = tool({
    description:
      'Consulta la agenda del usuario (recordatorios y eventos programados) por fecha. ' +
      'Usar SIEMPRE para "¿qué tengo hoy/mañana/esta semana?", "¿tengo algo programado?", ' +
      '"¿qué tenía para hoy?", en vez de buscar_memoria.',
    parameters: z.object({
      periodo: z
        .enum(['hoy', 'manana', 'semana', 'mes'])
        .default('hoy')
        .describe('Rango: hoy, manana (mañana), semana (próximos 7 días) o mes (próximos 30 días).'),
    }),
    execute: async ({ periodo }) => {
      let desde = arDateStr(0);
      let hasta = arDateStr(0);
      if (periodo === 'manana') {
        desde = arDateStr(1);
        hasta = arDateStr(1);
      } else if (periodo === 'semana') {
        desde = arDateStr(0);
        hasta = arDateStr(7);
      } else if (periodo === 'mes') {
        desde = arDateStr(0);
        hasta = arDateStr(30);
      }

      const res = await pool.query(
        `SELECT contenido, tipo,
                to_char(coalesce(recordatorio_fecha, fecha_original) AT TIME ZONE $4,
                        'DD/MM HH24:MI') AS cuando
           FROM memorias
          WHERE usuario_id = $1 AND estado = 'activo'
            AND coalesce(recordatorio_fecha, fecha_original) IS NOT NULL
            AND (coalesce(recordatorio_fecha, fecha_original) AT TIME ZONE $4)::date
                BETWEEN $2::date AND $3::date
          ORDER BY coalesce(recordatorio_fecha, fecha_original)`,
        [userId, desde, hasta, TZ],
      );

      if (res.rows.length === 0) {
        return { periodo, eventos: [], nota: 'No hay nada agendado en ese periodo.' };
      }
      return { periodo, eventos: res.rows };
    },
  });

  const crear_recordatorio = tool({
    description:
      'Crea un recordatorio para el usuario. Usar cuando pida "recordame X", "avisame Y el viernes", ' +
      'agendar un turno/cita, un vencimiento, etc. Fercho le avisará por WhatsApp cerca de la fecha.',
    parameters: z.object({
      contenido: z.string().describe('Qué hay que recordar, en una frase clara.'),
      fecha_hora: z
        .string()
        .describe(
          'Fecha y hora del evento en ISO 8601 con offset -03:00 (ej: 2026-09-25T15:00:00-03:00). ' +
            'Calculala a partir de la fecha actual del contexto. Si no hay hora, usá 09:00.',
        ),
      mensaje: z
        .string()
        .optional()
        .describe('Mensaje breve y humano que Fercho enviará (ej: "Ey, acordate de comprar pan 😊").'),
    }),
    execute: async ({ contenido, fecha_hora, mensaje }) => {
      const res = await pool.query(
        `INSERT INTO memorias
           (usuario_id, contenido, tipo, categoria, estado, nivel_certeza, fuente,
            recordatorio_fecha, recordatorio_mensaje, recordatorio_enviado,
            importancia, creado_en, event_time)
         VALUES ($1, $2, 'recordatorio', 'agenda', 'activo', 'confirmado', 'fercho-core',
            $3::timestamptz, $4, false, 3, now(), $3::timestamptz)
         RETURNING id`,
        [userId, contenido, fecha_hora, mensaje || contenido],
      );
      return { creado: true, id: res.rows[0]?.id ?? null, cuando: fecha_hora };
    },
  });

  return { agenda, crear_recordatorio };
}
