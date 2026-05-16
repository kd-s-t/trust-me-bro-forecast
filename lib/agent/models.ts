export type AgentModel = {
  id: string;
  label: string;
  description?: string;
};

export const AGENT_MODELS: readonly AgentModel[] = [
  { id: "gpt-4o", label: "GPT-4o", description: "Best overall" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", description: "Fast & cheap" },
  { id: "claude-sonnet", label: "Claude Sonnet", description: "Strong reasoning" },
  { id: "gemini-flash", label: "Gemini Flash", description: "Quick replies" },
] as const;

export const DEFAULT_AGENT_MODEL_ID = AGENT_MODELS[0]!.id;

export function getAgentModel(id: string): AgentModel | undefined {
  return AGENT_MODELS.find((m) => m.id === id);
}
