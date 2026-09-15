/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Configuración de Keys — SMTP y Pusher editables sin tocar .env/deploy.
 * Mismo criterio de campos secretos masked que AIConfigPanel (hasValue +
 * últimos 4 chars, nunca el valor completo) — un campo secreto vacío al
 * guardar significa "conservar el actual" (ver SystemKeyConfigController).
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mail, Radio, Save, Zap } from "lucide-react";
import { itemVariants } from "@/animations";
import { SkeletonBlock, SkeletonCard, SkeletonGroup, SkeletonGroupItem } from "@/components/SkeletonLoader";
import Card from "@/components/UI/Card";
import SectionHeader from "@/components/UI/SectionHeader";
import TextField from "@/components/UI/TextField";
import Button from "@/components/UI/Button";
import { useToast } from "@/components/UI/Toast";
import { getErrorMessage } from "@/services/logger";
import { useSystemKeyConfig, type SystemKeyGroup } from "@/hooks/useSystemKeyConfig";
import { useConfigAuditLogs } from "@/hooks/useConfigAuditLogs";

interface FieldDef {
  key: string;
  label: string;
  secret?: boolean;
  placeholder?: string;
}

const SMTP_FIELDS: FieldDef[] = [
  { key: "host", label: "Host SMTP", placeholder: "smtp.mailgun.org" },
  { key: "port", label: "Puerto", placeholder: "587" },
  { key: "encryption", label: "Encriptación (tls/ssl)", placeholder: "tls" },
  { key: "username", label: "Usuario" },
  { key: "password", label: "Contraseña", secret: true },
  { key: "from_address", label: "Email remitente", placeholder: "no-reply@ivoo.com" },
  { key: "from_name", label: "Nombre remitente", placeholder: "IVOO Gestión" },
];

const PUSHER_FIELDS: FieldDef[] = [
  { key: "app_id", label: "App ID" },
  { key: "key", label: "Key", secret: true },
  { key: "secret", label: "Secret", secret: true },
  { key: "cluster", label: "Cluster", placeholder: "us2" },
];

interface KeysConfigPanelProps {
  authToken: string;
  activeRole?: string;
}

export default function KeysConfigPanel({ authToken, activeRole }: KeysConfigPanelProps) {
  const { showToast } = useToast();
  const isSuperadmin = activeRole === "SUPERADMIN";
  const { configs, isLoading, updateConfig, testConfig } = useSystemKeyConfig(authToken);
  const { prependLocal: prependAuditLog } = useConfigAuditLogs(authToken, isSuperadmin);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-3 w-24 mb-1" />
        <SkeletonGroup className="space-y-6">
          <SkeletonGroupItem><SkeletonCard /></SkeletonGroupItem>
          <SkeletonGroupItem><SkeletonCard /></SkeletonGroupItem>
        </SkeletonGroup>
      </div>
    );
  }

  const smtp = configs.find((c) => c.group === "smtp");
  const pusher = configs.find((c) => c.group === "pusher");

  return (
    <div className="space-y-6">
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <KeyGroupCard
          group="smtp"
          icon={<Mail className="h-5 w-5" />}
          title="Mailer SMTP"
          description="Credenciales del servidor de correo saliente usado para notificaciones por email."
          color="sky"
          fields={SMTP_FIELDS}
          fieldValues={smtp?.fields ?? {}}
          isActive={smtp?.isActive ?? false}
          updatedAt={smtp?.updatedAt ?? null}
          onSave={async (data, isActive) => {
            const updated = await updateConfig("smtp", { ...data, isActive });
            if (updated.auditLog) prependAuditLog(updated.auditLog);
          }}
          onTest={async (data) => {
            if (!data.toEmail) {
              return { success: false, message: "Indica un email destino para la prueba." };
            }
            return testConfig("smtp", data);
          }}
          extraTestField={{ key: "toEmail", label: "Enviar prueba a", placeholder: "tu@correo.com" }}
          showToast={showToast}
        />
      </motion.div>

      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <KeyGroupCard
          group="pusher"
          icon={<Radio className="h-5 w-5" />}
          title="Pusher (WebSocket)"
          description="Credenciales del canal privado de notificaciones en tiempo real."
          color="purple"
          fields={PUSHER_FIELDS}
          fieldValues={pusher?.fields ?? {}}
          isActive={pusher?.isActive ?? false}
          updatedAt={pusher?.updatedAt ?? null}
          onSave={async (data, isActive) => {
            const updated = await updateConfig("pusher", { ...data, isActive });
            if (updated.auditLog) prependAuditLog(updated.auditLog);
          }}
          onTest={async () => testConfig("pusher")}
          showToast={showToast}
        />
      </motion.div>
    </div>
  );
}

interface KeyGroupCardProps {
  group: SystemKeyGroup;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  fields: FieldDef[];
  fieldValues: Record<string, { hasValue: boolean; value: string }>;
  isActive: boolean;
  updatedAt: string | null;
  onSave: (data: Record<string, string>, isActive: boolean) => Promise<void>;
  onTest: (data: Record<string, string>) => Promise<{ success: boolean; message: string }>;
  extraTestField?: FieldDef;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

function KeyGroupCard({
  icon,
  title,
  description,
  color,
  fields,
  fieldValues,
  isActive,
  updatedAt,
  onSave,
  onTest,
  extraTestField,
  showToast,
}: KeyGroupCardProps) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [active, setActive] = useState(isActive);
  const [testExtra, setTestExtra] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setActive(isActive);
  }, [isActive]);

  const valueOf = (field: FieldDef) => draft[field.key] ?? "";
  const placeholderOf = (field: FieldDef) => {
    const current = fieldValues[field.key];
    if (field.secret && current?.hasValue) return current.value;
    return field.placeholder ?? "";
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(draft, active);
      setDraft({});
      showToast("Configuración guardada correctamente.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al guardar la configuración."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const payload = extraTestField ? { ...draft, [extraTestField.key]: testExtra } : draft;
      const result = await onTest(payload);
      showToast(result.message, result.success ? "success" : "error");
    } catch (err) {
      showToast(getErrorMessage(err, "Error al probar la conexión."), "error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <SectionHeader
        icon={icon}
        title={title}
        description={description}
        color={color}
        actions={
          <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Activo
          </label>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        {fields.map((field) => (
          <TextField
            key={field.key}
            id={`${title}-${field.key}`}
            label={field.label}
            value={valueOf(field)}
            onChange={(v) => setDraft((prev) => ({ ...prev, [field.key]: v }))}
            placeholder={placeholderOf(field)}
          />
        ))}
      </div>

      {extraTestField && (
        <div className="mt-4 max-w-sm">
          <TextField
            id={`${title}-${extraTestField.key}`}
            label={extraTestField.label}
            value={testExtra}
            onChange={setTestExtra}
            placeholder={extraTestField.placeholder}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-border-subtle">
        <span className="text-[11px] text-text-tertiary">
          {updatedAt ? `Última actualización: ${updatedAt}` : "Sin configurar todavía."}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<Zap className="h-3.5 w-3.5" />} isLoading={isTesting} onClick={handleTest}>
            Probar conexión
          </Button>
          <Button size="sm" variant="primary" colorScheme="emerald" icon={<Save className="h-3.5 w-3.5" />} isLoading={isSaving} onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}
