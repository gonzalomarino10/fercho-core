# Fercho Core 🧠

El "cerebro" de Fercho 2.0: un servicio HTTP que recibe un mensaje y devuelve la respuesta,
corriendo un **agente con tool-calling** (orquestador) sobre tu memoria semántica y tus providers.

Este es el esqueleto de la **Fase 1**. Reusa el Postgres que ya tenés (con pgvector y las
funciones `buscar_memoria` / `guardar_memoria` / `tocar_memorias` que creamos). No reemplaza
todavía a n8n: convive. Más adelante, el flujo de WhatsApp pasa a ser un adapter fino que
reenvía a `POST /message`.

## Qué hace hoy

- `POST /message` → corre el loop del agente y responde.
- Herramientas incluidas: **memoria** (buscar/guardar semántica), **clima** (Open-Meteo, sin key),
  **búsqueda web** (Tavily, opcional).
- `GET /health` → valida conexión a la base y que existan las funciones de memoria.

## Requisitos

- Node.js 20 o superior.
- Acceso a tu Postgres (el mismo de Fercho) con pgvector ya instalado.
- API key de OpenAI. (Tavily es opcional.)

## Puesta en marcha

```bash
# 1. instalar dependencias
npm install

# 2. configurar entorno
cp .env.example .env
#   editá .env: DATABASE_URL, OPENAI_API_KEY, FERCHO_API_TOKEN (inventá un secreto)

# 3. arrancar en modo desarrollo (recarga sola al editar)
npm run dev
```

Deberías ver: `🧠 Fercho Core escuchando en http://localhost:8787`

## Probarlo

Chequeo de salud (no pide token):

```bash
curl http://localhost:8787/health
# { "ok": true, "db": { "ok": true, "funciones": ["buscar_memoria","guardar_memoria","tocar_memorias"] } }
```

Mandarle un mensaje (usá tu FERCHO_API_TOKEN y tu número como user_id):

```bash
curl -X POST http://localhost:8787/message \
  -H "Authorization: Bearer TU_FERCHO_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "user_id": "5491100000000", "mensaje": "¿dónde trabaja mi hermano?" }'
```

Respuesta:

```json
{
  "output": "Tu hermano labura en YPF 🙂",
  "meta": { "pasos": 2, "tools_usadas": ["buscar_memoria"], "ms": 1840 }
}
```

Probá también: guardar un dato ("mi hermano se llama Juan y labura en YPF"), preguntar el clima
("¿cómo está el clima en Vicente López?"), o algo de actualidad si configuraste Tavily.

## Estructura

```
src/
  index.ts         # servidor Fastify: /message y /health
  orchestrator.ts  # el loop del agente (LLM + tool-calling)
  prompt.ts        # personalidad de Fercho + fecha actual
  llm.ts           # modelo de chat + embeddings
  db.ts            # pool de Postgres + helper de vectores
  config.ts        # variables de entorno
  tools/
    index.ts       # registro de herramientas (acá se agregan nuevas)
    memory.ts      # buscar_memoria / guardar_memoria (contra tu SQL)
    web.ts         # búsqueda web (Tavily)
    weather.ts     # clima (Open-Meteo)
```

## Cómo se agrega un provider nuevo (la parte importante)

Crear un archivo en `src/tools/` que exporte una `tool({ description, parameters, execute })`
y sumarlo en `src/tools/index.ts`. El orquestador lo descubre solo; no se toca nada más.
Ese es el diseño modular: agregar calendar, gmail, finanzas (IOL) o imágenes = un archivo.

## Próximos pasos (siguientes sesiones)

1. **Adapter de WhatsApp**: workflow de n8n que reenvía los mensajes entrantes a `POST /message`
   y manda la respuesta. (El Core queda como cerebro único.)
2. **Triage + model router**: elegir modelo por costo/complejidad y forzar búsqueda cuando
   haga falta frescura.
3. **Memoria de conversación**: recordar el hilo (últimos N turnos) por usuario.
4. **Observabilidad**: Langfuse para ver cada decisión (ya devolvemos `meta` como semilla).
5. **Acciones con confirmación**: tools con efecto (mail, agenda) que piden OK.
```
