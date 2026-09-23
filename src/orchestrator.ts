import { generateText } from 'ai';
import { chatModel } from './llm.js';
import { buildTools } from './tools/index.js';
import { systemPrompt } from './prompt.js';

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
 * El corazón: recibe un mensaje, corre el loop del agente (LLM + tool-calling)
 * y devuelve la respuesta final. `maxSteps` deja que el modelo llame varias
 * herramientas y razone en cadena hasta resolver.
 */
export async function handleMessage(req: FerchoRequest): Promise<FerchoResponse> {
  const t0 = Date.now();
  const tools = buildTools(req.user_id);

  const result = await generateText({
    model: chatModel,
    system: systemPrompt(),
    prompt: req.mensaje,
    tools,
    maxSteps: 6,
  });

  // Qué herramientas se usaron (para observabilidad temprana).
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
