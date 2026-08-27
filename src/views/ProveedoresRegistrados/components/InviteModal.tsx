/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de invitación a proveedor (generar enlace de propuesta de
 * materiales) — extraído de ProveedoresRegistrados. Rediseño premium en dos
 * pasos secuenciales con transición propia (Buscar/seleccionar obra →
 * Enlace generado) en vez de dos bloques apilados en el mismo scroll: la
 * jerarquía "primero elegís, después obtenés" queda explícita en el layout,
 * no solo en el estado interno.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ClipboardCheck, Link2, Sparkles } from "lucide-react";
import { useToast } from "../../../components/UI/Toast";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import SearchableSelectList from "../../../components/UI/SearchableSelectList";
import { copyToClipboard } from "../../../utils/clipboard";
import { containerVariants, itemVariants, springs } from "../../../animations";
import { ProjectStatus } from "../../../types";
import type { Contractor, Project } from "../../../types";

interface InviteModalProps {
  contractor: Contractor | null;
  projects: Project[];
  onClose: () => void;
  onInvite: (payload: {
    project_id: string;
    supplierName: string;
    supplierCompany: string | null;
    supplierContact: string;
  }) => Promise<{ token: string; projectTitle: string }>;
}

export default function InviteModal({ contractor, projects, onClose, onInvite }: InviteModalProps) {
  const { showToast } = useToast();
  const [inviteProjectId, setInviteProjectId] = useState("");
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [generatedToken, setGeneratedToken] = useState("");
  const [generatedProjectTitle, setGeneratedProjectTitle] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const resetForm = () => {
    setInviteProjectId("");
    setGeneratedToken("");
    setGeneratedProjectTitle("");
    setLinkCopied(false);
  };

  // Resetea el formulario cada vez que se abre el modal para un proveedor.
  useEffect(() => {
    if (contractor) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractor]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== ProjectStatus.COMPLETADO_PAGADO),
    [projects],
  );

  const handleGenerateInvite = async () => {
    if (!inviteProjectId || !contractor) return;
    setIsCreatingInvite(true);
    try {
      const data = await onInvite({
        project_id: inviteProjectId,
        supplierName: contractor.name,
        supplierCompany: null,
        supplierContact: contractor.email,
      });
      setGeneratedToken(data.token);
      setGeneratedProjectTitle(data.projectTitle);
      setLinkCopied(false);
    } catch {
      showToast("No se pudo generar el enlace. Intenta nuevamente.", "error");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const inviteUrl = generatedToken
    ? `${window.location.origin}/propuesta-materiales/${generatedToken}`
    : "";

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    const ok = await copyToClipboard(inviteUrl);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } else {
      showToast("No se pudo copiar el enlace. Cópialo manualmente.", "error");
    }
  };

  return (
    <Modal
      isOpen={contractor !== null}
      onClose={onClose}
      title={contractor?.name}
      badge="Propuesta de materiales"
      infoLine={contractor?.email}
      icon={<Link2 className="h-5 w-5" />}
      iconColor="purple"
      maxWidth="max-w-xl"
    >
      <AnimatePresence mode="wait">
        {generatedToken ? (
          // ── Paso 2: enlace generado ──────────────────────────────────
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-white p-5 space-y-4"
            >
              <motion.div variants={itemVariants} className="flex items-center gap-3">
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...springs.snappy, delay: 0.1 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"
                >
                  <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
                </motion.span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Enlace generado</div>
                  <div className="text-sm font-black text-slate-800 truncate">{contractor?.name}</div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/70 px-3.5 py-2.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-600 truncate">Obra: {generatedProjectTitle}</span>
              </motion.div>

              <motion.p
                variants={itemVariants}
                className="break-all rounded-xl border border-emerald-200 bg-white px-3.5 py-3 font-mono text-[11px] text-indigo-600 leading-relaxed shadow-xs"
              >
                {inviteUrl}
              </motion.p>

              <motion.div variants={itemVariants}>
                <motion.button
                  type="button"
                  onClick={handleCopyLink}
                  whileHover={{ scale: 1.012, y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={`relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-xs font-black text-white shadow-md transition-shadow duration-200 ${
                    linkCopied
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-emerald-500/25"
                      : "bg-gradient-to-r from-indigo-600 to-indigo-500 shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30"
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={linkCopied ? "copied" : "copy"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-2"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      {linkCopied ? "Copiado" : "Copiar enlace"}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          // ── Paso 1: seleccionar obra ─────────────────────────────────
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Obra objetivo
              </span>
              <SearchableSelectList
                items={activeProjects}
                rowKey={(p) => p.id}
                getSearchText={(p) => `${p.title} ${p.id}`}
                selectedKey={inviteProjectId || null}
                onSelect={(p) => setInviteProjectId(p.id)}
                searchPlaceholder="Buscar obra por título o ID..."
                searchAriaLabel="Buscar obra"
                layoutIdNamespace="invite-project"
                emptyMessage="No hay obras activas disponibles."
                emptySearchMessage="No se encontraron obras con ese criterio."
                noun="obra"
                nounPlural="obras"
                selectedLabel={(p) => p.id}
                maxHeight="14rem"
                renderItem={(p, isSelected) => (
                  <>
                    <div className={`text-xs font-semibold truncate ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>{p.title}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-400">{p.id}</div>
                  </>
                )}
              />
            </div>

            <motion.div whileHover={inviteProjectId ? { scale: 1.012, y: -1 } : undefined} whileTap={inviteProjectId ? { scale: 0.985 } : undefined} transition={{ duration: 0.15, ease: "easeOut" }}>
              <Button
                onClick={handleGenerateInvite}
                disabled={isCreatingInvite || !inviteProjectId}
                isLoading={isCreatingInvite}
                variant="primary"
                colorScheme="indigo"
                icon={<Link2 className="h-4 w-4" />}
                className="w-full justify-center py-3 text-xs"
              >
                {isCreatingInvite ? "Generando enlace..." : "Generar enlace único"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
