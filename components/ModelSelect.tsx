"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  AGENT_MODELS,
  DEFAULT_AGENT_MODEL_ID,
  type AgentModel,
} from "@/lib/agent/models";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  disabled?: boolean;
};

export function ModelSelect({ className, disabled = false }: Props) {
  const [modelId, setModelId] = useState(DEFAULT_AGENT_MODEL_ID);
  const selected =
    AGENT_MODELS.find((m) => m.id === modelId) ?? (AGENT_MODELS[0] as AgentModel);

  return (
    <div className={cn("relative", className)}>
      <label htmlFor="agent-model" className="sr-only">
        Model
      </label>
      <select
        id="agent-model"
        value={modelId}
        disabled={disabled}
        onChange={(e) => setModelId(e.target.value)}
        className={cn(
          "flex h-7 w-full cursor-pointer appearance-none rounded border border-input bg-background py-0 pl-2 pr-6 text-xs shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        aria-label={`Model: ${selected.label}`}
      >
        {AGENT_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}
