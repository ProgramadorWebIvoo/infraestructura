/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Configuración de Keys — SMTP, Pusher y Storage editables sin tocar
 * .env/deploy. Mismo criterio de campos secretos masked que AIConfigPanel
 * (hasValue + últimos 4 chars, nunca el valor completo) — un campo secreto
 * vacío al guardar significa "conservar el actual" (ver
 * SystemKeyConfigController). Para "storage", el checkbox "Activo" decide
 * nube (S3) vs servidor (local) — mismo campo `isActive` que en los otros
 * grupos, solo cambia el label (ver `activeLabel`).
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { HardDrive, Mail, Radio, Save, Zap } from "lucide-react";
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
  /** Se renderiza como checkbox y se envía como boolean, no string (ej. use_path_style_endpoint). */
  boolean?: boolean;
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

const STORAGE_FIELDS: FieldDef[] = [
  { key: "key", label: "Access Key ID", secret: true },
  { key: "secret", label: "Secret Access Key", secret: true },
  { key: "region", label: "Región", placeholder: "us-east-1" },
  { key: "bucket", label: "Bucket" },
  { key: "endpoint", label: "Endpoint (opcional, S3-compatible)", placeholder: "https://nyc3.digitaloceanspaces.com" },
  { key: "url", label: "URL pública (opcional)", placeholder: "https://bucket.s3.amazonaws.com" },
  { key: "use_path_style_endpoint", label: "Usar path-style endpoint", boolean: true },
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
  const storage = configs.find((c) => c.group === "storage");

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

      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <KeyGroupCard
          group="storage"
          icon={<HardDrive className="h-5 w-5" />}
          title="Almacenamiento de archivos"
          description="Ubicación de los archivos subidos: en el servidor o en un bucket S3/S3-compatible en la nube."
          color="amber"
          activeLabel="Usar almacenamiento en la nube (S3)"
          fields={STORAGE_FIELDS}
          fieldValues={storage?.fields ?? {}}
          isActive={storage?.isActive ?? false}
          updatedAt={storage?.updatedAt ?? null}
          onSave={async (data, isActive) => {
            const updated = await updateConfig("storage", { ...data, isActive });
            if (updated.auditLog) prependAuditLog(updated.auditLog);
          }}
          onTest={async (data) => testConfig("storage", data as Record<string, string>)}
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
  /** Label del checkbox "Activo" — por defecto "Activo", storage lo personaliza. */
  activeLabel?: string;
  updatedAt: string | null;
  onSave: (data: Record<string, string | boolean>, isActive: boolean) => Promise<void>;
  onTest: (data: Record<string, string | boolean>) => Promise<{ success: boolean; message: string }>;
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
  activeLabel = "Activo",
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

  /** Campos `boolean: true` viajan como string "true"/"false" en el draft (mismo tipo
   * que el resto de campos) pero deben salir como boolean real: Laravel `boolean` rule
   * no acepta la palabra "true"/"false" en update(), solo 1/0/true/false nativos. */
  const buildPayload = (): Record<string, string | boolean> => {
    const payload: Record<string, string | boolean> = { ...draft };
    fields.forEach((field) => {
      if (field.boolean && field.key in draft) payload[field.key] = draft[field.key] === "true";
    });
    return payload;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(buildPayload(), active);
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
      const payload = extraTestField ? { ...buildPayload(), [extraTestField.key]: testExtra } : buildPayload();
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
            {activeLabel}
          </label>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        {fields.map((field) =>
          field.boolean ? (
            <label
              key={field.key}
              className="flex items-center gap-2 text-sm font-medium text-text-secondary cursor-pointer select-none self-end pb-2"
            >
              <input
                type="checkbox"
                checked={valueOf(field) === "true"}
                onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.checked ? "true" : "false" }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              {field.label}
            </label>
          ) : (
            <TextField
              key={field.key}
              id={`${title}-${field.key}`}
              label={field.label}
              value={valueOf(field)}
              onChange={(v) => setDraft((prev) => ({ ...prev, [field.key]: v }))}
              placeholder={placeholderOf(field)}
            />
          ),
        )}
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
