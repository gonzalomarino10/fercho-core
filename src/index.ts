import Fastify from 'fastify';
import { config } from './config.js';
import { dbHealth } from './db.js';
import { handleMessage } from './orchestrator.js';

const app = Fastify({ logger: true });

// --- Auth simple por Bearer token (el adapter de n8n lo manda) ---
app.addHook('onRequest', async (req, reply) => {
  if (req.url.split('?')[0] === '/health') return; // health es público
  const auth = req.headers.authorization ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== config.apiToken) {
    reply.code(401).send({ error: 'no autorizado' });
  }
});

// --- Health check: valida DB + funciones de memoria ---
app.get('/health', async () => {
  try {
    const db = await dbHealth();
    return { ok: db.ok, db };
  } catch (e: any) {
    console.error('=== HEALTH ERROR ===');
    console.error('message:', JSON.stringify(e?.message));
    console.error('code:', e?.code, '| name:', e?.name);
    console.error('full:', JSON.stringify(e, Object.getOwnPropertyNames(e ?? {})));
    if (Array.isArray(e?.errors)) {
      for (const sub of e.errors) console.error('  sub:', sub?.code, sub?.message);
    }
    return {
      ok: false,
      error: e?.message || String(e),
      code: e?.code,
      name: e?.name,
      detail: Array.isArray(e?.errors)
        ? e.errors.map((x: any) => ({ message: x?.message, code: x?.code }))
        : undefined,
    };
  }
});

// --- Endpoint principal: un mensaje entra, una respuesta sale ---
app.post('/message', async (req, reply) => {
  const body = req.body as { user_id?: string; mensaje?: string };
  if (!body?.user_id || !body?.mensaje) {
    return reply.code(400).send({ error: 'faltan user_id y/o mensaje' });
  }
  try {
    const res = await handleMessage({ user_id: body.user_id, mensaje: body.mensaje });
    return res;
  } catch (e: any) {
    req.log.error(e);
    return reply.code(500).send({ error: 'fercho tuvo un problema procesando el mensaje' });
  }
});

app
  .listen({ port: config.port, host: '0.0.0.0' })
  .then(() => {
    console.log(`\n🧠 Fercho Core escuchando en http://localhost:${config.port}`);
    console.log(`   Zona horaria: ${config.timezone} · Modelo: ${config.model}\n`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
