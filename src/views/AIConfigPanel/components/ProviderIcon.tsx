import { Brain } from "lucide-react";
import { PROVIDER_LABELS, providerColor } from "../../../constants/aiProviders";

export default function ProviderIcon({ provider }: { provider: string }) {
  const semantic = providerColor(provider);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${semantic.border100} ${semantic.bg50} ${semantic.text700} px-2.5 py-0.5 text-[10px] font-bold`}
    >
      <Brain className="h-3 w-3" />
      {PROVIDER_LABELS[provider] ?? provider}
    </span>
  );
}
