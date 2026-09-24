import { generateText } from 'ai';
import { chatModel } from './llm.js';
import { buildTools } from './tools/index.js';
import { systemPrompt } from './prompt.js';
import { getHistory, saveTurns } from './history.js';

export interface FerchoRequest {
  user_id: string;
  mensaje: string;
}

export interface FerchoResponse {
  output: string;
  meta: {
    pasos: number;
    tools_usadas: string[];
    ms: number;
  };
}

/**
 * El corazón: recibe un mensaje, carga el hilo reciente de la conversación,
 * corre el loop del agente (LLM + tool-calling) y devuelve la respuesta final.
 * Después guarda el turno para que la próxima vez haya contexto.
 */
export async function handleMessage(req: FerchoRequest): Promise<FerchoResponse> {
  const t0 = Date.now();
  const tools = buildTools(req.user_id);

  // Hilo reciente (últimos 10 turnos) + el mensaje nuevo.
  const history = await getHistory(req.user_id, 10);
  const messages = [
    ...history,
    { role: 'user' as const, content: req.mensaje },
  ];

  const result = await generateText({
    model: chatModel,
    system: systemPrompt(),
    messages,
    tools,
    maxSteps: 6,
  });

  // Guardar el turno en segundo plano (no demora la respuesta).
  saveTurns(req.user_id, req.mensaje, result.text).catch((e) =>
    console.error('[history] no se pudo guardar el turno:', e?.message),
  );

  const toolsUsadas = new Set<string>();
  for (const step of result.steps) {
    for (const call of step.toolCalls ?? []) toolsUsadas.add(call.toolName);
  }

  return {
    output: result.text,
    meta: {
      pasos: result.steps.length,
      tools_usadas: [...toolsUsadas],
      ms: Date.now() - t0,
    },
  };
}
