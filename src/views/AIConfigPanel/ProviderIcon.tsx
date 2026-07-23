import { Brain } from "lucide-react";
import { PROVIDER_COLORS, PROVIDER_LABELS } from "../../hooks/useAIConfig";

export default function ProviderIcon({ provider }: { provider: string }) {
  const color = PROVIDER_COLORS[provider] ?? PROVIDER_COLORS.openai;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${color.badge}`}>
      <Brain className="h-3 w-3" />
      {PROVIDER_LABELS[provider] ?? provider}
    </span>
  );
}
