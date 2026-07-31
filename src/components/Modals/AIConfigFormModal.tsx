import { type ReactNode } from "react";
import { Brain, Eye, EyeOff, CheckCircle, XCircle, Shield } from "lucide-react";
import Modal from "../../components/UI/Modal";
import Button from "../../components/UI/Button";
import { AI_PROVIDERS, PROVIDER_LABELS } from "../../constants/aiProviders";
import type { AiConfigForm } from "../../hooks/useAIConfig";

const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500";
const selectClass =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const inputClass =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-700 placeholder-slate-400 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

// ---------------------------------------------------------------------------
// Wrappers de presentación (DRY de los 6 campos del formulario)
// ---------------------------------------------------------------------------
function AiFormField({
  label,
  htmlFor,
  required = false,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label} {required && "*"}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] font-medium text-slate-400">{hint}</p>}
    </div>
  );
}

function TogglePill({
  active,
  activeClass,
  inactiveClass,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  activeClass: string;
  inactiveClass: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
        active ? activeClass : inactiveClass
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export default function AIConfigFormModal({
  isOpen,
  mode,
  editingId,
  form,
  isSaving,
  showApiKey,
  availableModels,
  onClose,
  onSave,
  onFormChange,
  onShowApiKeyChange,
}: {
  isOpen: boolean;
  mode: "create" | "edit";
  editingId: number | null;
  form: AiConfigForm;
  isSaving: boolean;
  showApiKey: boolean;
  availableModels: string[];
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: AiConfigForm) => void;
  onShowApiKeyChange: (show: boolean) => void;
}) {
  const set = (field: keyof AiConfigForm, value: unknown) =>
    onFormChange({ ...form, [field]: value });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Nueva configuración de IA" : "Editar configuración"}
      badge={mode === "create" ? "Creación" : `Editando #${editingId ?? ""}`}
      icon={<Brain className="h-5 w-5" />}
      iconColor="indigo"
      maxWidth="max-w-lg"
      closeDisabled={isSaving}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" isLoading={isSaving} icon={<Brain className="h-4 w-4" />} onClick={onSave}>
            {mode === "create" ? "Crear" : "Guardar cambios"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <AiFormField label="Proveedor" htmlFor="ai-provider" required>
          <select
            id="ai-provider"
            value={form.provider}
            onChange={(e) => {
              const provider = e.target.value as AiConfigForm["provider"];
              onFormChange({ ...form, provider, model: "" });
            }}
            className={selectClass}
          >
            {AI_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {PROVIDER_LABELS[provider]}
              </option>
            ))}
          </select>
        </AiFormField>

        <AiFormField label="Modelo" htmlFor="ai-model" required>
          <select
            id="ai-model"
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
            className={selectClass}
          >
            <option value="">Seleccionar modelo...</option>
            {availableModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </AiFormField>

        <AiFormField
          label="API Key"
          htmlFor="ai-api-key"
          required={mode === "create"}
          hint="Se almacenará cifrada (AES-256-GCM) en la base de datos."
        >
          <div className="relative">
            <input
              id="ai-api-key"
              type={showApiKey ? "text" : "password"}
              value={form.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
              placeholder={
                mode === "edit" ? "Dejar vacío para mantener la actual" : "sk-proj-..."
              }
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => onShowApiKeyChange(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showApiKey ? "Ocultar API Key" : "Mostrar API Key"}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </AiFormField>

        <div className="grid grid-cols-2 gap-4">
          <AiFormField label="Base URL" htmlFor="ai-base-url">
            <input
              id="ai-base-url"
              type="text"
              value={form.baseUrl}
              onChange={(e) => set("baseUrl", e.target.value)}
              placeholder="https://api.openai.com/v1"
              className={inputClass}
            />
          </AiFormField>
          <AiFormField label="Max Tokens" htmlFor="ai-max-tokens">
            <input
              id="ai-max-tokens"
              type="number"
              min={1}
              max={100000}
              value={form.maxTokens}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  set("maxTokens", "");
                  return;
                }
                set("maxTokens", Math.max(1, parseInt(v, 10) || 1));
              }}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-center text-xs font-mono font-bold text-slate-700 outline-hidden focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </AiFormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <AiFormField label="Estado">
            <TogglePill
              active={form.isActive}
              activeClass="border-emerald-200 bg-emerald-50 text-emerald-700"
              inactiveClass="border-slate-200 bg-slate-100 text-slate-500"
              icon={form.isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              label={form.isActive ? "Activo" : "Inactivo"}
              onClick={() => set("isActive", !form.isActive)}
            />
          </AiFormField>
          <AiFormField label="Respaldo (Fallback)">
            <TogglePill
              active={form.isFallback}
              activeClass="border-amber-200 bg-amber-50 text-amber-700"
              inactiveClass="border-slate-200 bg-slate-100 text-slate-500"
              icon={<Shield className="h-4 w-4" />}
              label={form.isFallback ? "Fallback activo" : "Principal"}
              onClick={() => set("isFallback", !form.isFallback)}
            />
          </AiFormField>
        </div>
        <p className="text-[10px] font-medium text-slate-400">
          {form.isFallback
            ? "Este modelo se usará como respaldo si el principal falla."
            : "Marca como respaldo para usarlo cuando el modelo principal no esté disponible."}
        </p>
      </div>
    </Modal>
  );
}
