/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "../../components/UI/Toast";
import { CheckCircle, Loader2, Package } from "lucide-react";
import { apiFetch } from "../../services/api";
import TopBar from "./TopBar";
import ProjectSummary from "./ProjectSummary";
import MaterialsProposalTable from "./MaterialsProposalTable";
import ProposalDetailsSection from "./ProposalDetailsSection";
import { sanitize, type DurationUnit, type InvitationPublicInfo, type ItemRow } from "./types";

export default function PropuestaMaterialesPublica() {
  const { showToast } = useToast();
  const { token } = useParams<{ token: string }>();

  const [invitation, setInvitation] = useState<InvitationPublicInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [estimatedDays, setEstimatedDays] = useState<number | "">("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("dias");
  const [advancePercent, setAdvancePercent] = useState<number | "">("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState("");

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      try {
        const data = await apiFetch<InvitationPublicInfo>(`/public/invitations/${token}`);
        setInvitation(data);
        setItems(
          data.project.materials.map((m) => ({
            _id: m.id,
            materialName: m.name,
            quantity: m.quantity,
            unit: m.unit,
            unitPrice: 0,
            totalPrice: 0,
            notes: "",
            isCustom: false,
          }))
        );
      } catch {
        setLoadError("No se pudo conectar con el servidor.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token]);

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };
      if (field === "unitPrice" || field === "quantity") {
        const uPrice = row.unitPrice === "" ? 0 : Number(row.unitPrice);
        const qty = row.quantity === "" ? 0 : Number(row.quantity);
        row.totalPrice = parseFloat((uPrice * qty).toFixed(2));
      }
      next[index] = row;
      return next;
    });
  };

  const addCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        _id: `custom-${Date.now()}`,
        materialName: "",
        quantity: 1,
        unit: "",
        unitPrice: "" as unknown as number,
        totalPrice: 0,
        notes: "",
        isCustom: true,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Strip incomplete custom rows silently
    const validItems = items.filter((i) => !i.isCustom || i.materialName.trim() !== "");

    const hasAnyPrice = validItems.some((i) => Number(i.unitPrice) > 0);
    if (!hasAnyPrice) {
      showToast("Ingresa precio unitario para al menos un material.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiFetch<{ id: string }>(`/public/invitations/${token}/proposal`, {
        method: "POST",
        body: JSON.stringify({
          estimatedDays: estimatedDays !== "" ? Number(estimatedDays) : null,
          durationUnit: estimatedDays !== "" ? durationUnit : null,
          advancePercent: advancePercent !== "" ? Number(advancePercent) : null,
          items: validItems.map((item) => ({
            materialName: sanitize(item.materialName).trim(),
            quantity: item.quantity === "" ? 0 : item.quantity,
            unit: sanitize(item.unit).trim(),
            unitPrice: item.unitPrice === "" ? 0 : item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes ? sanitize(item.notes).trim() : null,
          })),
          generalNotes: sanitize(generalNotes).trim() || null,
        }),
      });
      setSubmittedId(result.id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo enviar la propuesta.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-sky-400 animate-spin" />
      </div>
    );
  }

  if (loadError || !invitation) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Package className="h-12 w-12 text-slate-600 mx-auto" />
          <h2 className="text-xl font-black text-slate-300">{loadError || "Enlace no disponible"}</h2>
          <p className="text-sm text-slate-500">Verifique el enlace recibido o contacte a IVOO.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans antialiased">
      <TopBar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        <ProjectSummary invitation={invitation} />

        {submittedId ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-3">
            <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-black text-emerald-300">Propuesta enviada exitosamente</h3>
            <p className="text-sm text-emerald-200/80">
              Su cotizacion fue registrada con el codigo{" "}
              <span className="font-mono font-bold text-emerald-300">{submittedId}</span>.
            </p>
            <p className="text-xs text-slate-400">El equipo de IVOO revisara su propuesta y se comunicara con usted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <MaterialsProposalTable
              items={items}
              onUpdateItem={updateItem}
              onAddCustomItem={addCustomItem}
              onRemoveItem={removeItem}
            />

            <ProposalDetailsSection
              estimatedDays={estimatedDays}
              onEstimatedDaysChange={setEstimatedDays}
              durationUnit={durationUnit}
              onDurationUnitChange={setDurationUnit}
              advancePercent={advancePercent}
              onAdvancePercentChange={setAdvancePercent}
              generalNotes={generalNotes}
              onGeneralNotesChange={setGeneralNotes}
              isSubmitting={isSubmitting}
            />
          </form>
        )}
      </main>

      <footer className="border-t border-white/10 py-6 mt-10 text-center text-xs text-slate-600 font-medium">
        IVOO Gestion de Infraestructura &copy; {new Date().getFullYear()} — Portal de Cotizacion de Materiales
      </footer>
    </div>
  );
}
