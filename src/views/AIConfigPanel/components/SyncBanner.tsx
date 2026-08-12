import { motion } from "motion/react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

export default function SyncBanner({
  message,
  isError,
  onDismiss,
}: {
  message: string | null;
  isError?: boolean;
  onDismiss: () => void;
}) {
  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className={`flex items-center gap-2 rounded-xl border-l-4 px-4 py-3 text-xs font-semibold ${
        isError
          ? "border-l-rose-400 bg-rose-50 text-rose-700"
          : "border-l-emerald-400 bg-emerald-50 text-emerald-700"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle className="h-4 w-4 shrink-0" />
      )}
      {message}
      <button onClick={onDismiss} className="cursor-pointer ml-auto text-current opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
