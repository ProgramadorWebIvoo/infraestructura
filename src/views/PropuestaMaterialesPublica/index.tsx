/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portal público de cotización de materiales — lo que ve el proveedor
 * externo al abrir su enlace único, la carta de presentación de IVOO frente
 * a terceros. Rediseño premium: fondo con orbes en deriva lenta (mismo
 * lenguaje visual que LoginScreen/MaterialesProveedores), entrada en cascada
 * coordinada por sección, y confirmación de éxito con spring en vez de un
 * bloque estático.
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useToast } from "../../components/UI/Toast";
import { AlertTriangle, CheckCircle2, Loader2, Package } from "lucide-react";
import { apiFetch } from "../../services/api";
import { containerVariants, itemVariants, springs } from "../../animations";
import TopBar from "./components/TopBar";
import ProjectSummary from "./components/ProjectSummary";
import OrderCurrencySelector from "./components/OrderCurrencySelector";
import MaterialsProposalCards from "./components/MaterialsProposalCards";
import ProposalDetailsSection from "./components/ProposalDetailsSection";
import {
  sanitize,
  type DurationUnit,
  type InvitationPublicInfo,
  type ItemRow,
  type PublicCurrency,
  type PublicCatalogCategory,
} from "./types";

/**
 * Fondo compartido con LoginScreen/MaterialesProveedores — malla de
 * gradientes en deriva lenta, grid arquitectónico y grano fino. Inline acá
 * (no extraído a un componente compartido cross-vista) porque cada una vive
 * en una app pública distinta con su propio bundle de entrada; duplicar
 * ~30 líneas de JSX puramente decorativo es más simple que forzar un import
 * compartido entre módulos que no tienen otra razón para acoplarse.
 */
function BackgroundDecor() {
  const reduceMotion = useReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#020617_0%,#0b1220_38%,#0c1e3d_62%,#020617_100%)]" />
      <motion.div
        className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-sky-500/20 blur-[110px]"
        animate={reduceMotion ? undefined : { x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-indigo-500/15 blur-[120px]"
        animate={reduceMotion ? undefined : { x: [0, -40, 0], y: [0, -26, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 21, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 40%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(2,6,23,0.55)_100%)]" />
    </div>
  );
}

export default function PropuestaMaterialesPublica() {
  const { showToast } = useToast();
  const { token } = useParams<{ token: string }>();

  const [invitation, setInvitation] = useState<InvitationPublicInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [currencies, setCurrencies] = useState<PublicCurrency[]>([]);
  const [categories, setCategories] = useState<PublicCatalogCategory[]>([]);
  // Sin precarga: el proveedor debe elegir explícitamente la moneda con la
  // que cotiza TODO el pedido — no hay moneda por defecto (antes existía
  // solo por línea y sin obligar al proveedor a declararla).
  const [quoteCurrency, setQuoteCurrency] = useState("");
  const [estimatedDays, setEstimatedDays] = useState<number | "">("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("dias");
  const [advancePercent, setAdvancePercent] = useState<number | "">("");
  const [laborCost, setLaborCost] = useState<number | "">("");
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
            // Sin precarga: condición y garantía las declara el proveedor —
            // conditionStatus queda "" (no "new") para que el Select los
            // muestre vacíos y el proveedor los elija a propósito.
            conditionStatus: "" as ItemRow["conditionStatus"],
            warrantyDescription: "",
            technicalSpecs: {},
          }))
        );

        // Catálogos de referencia (moneda/categorías) — best-effort: si fallan,
        // el formulario sigue funcionando en USD/sin categoría (comportamiento
        // previo), no bloquean la carga de la propuesta en sí.
        const [currenciesData, categoriesData] = await Promise.allSettled([
          apiFetch<PublicCurrency[]>("/public/currencies"),
          apiFetch<PublicCatalogCategory[]>("/public/catalog-categories"),
        ]);
        if (currenciesData.status === "fulfilled") setCurrencies(currenciesData.value);
        if (categoriesData.status === "fulfilled") setCategories(categoriesData.value);
      } catch {
        setLoadError("No se pudo conectar con el servidor.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token]);

  const updateItem = (index: number, field: keyof ItemRow, value: ItemRow[keyof ItemRow]) => {
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

  const updateItemSpec = (index: number, specKey: string, value: string | number | boolean) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], technicalSpecs: { ...next[index].technicalSpecs, [specKey]: value } };
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
        conditionStatus: "" as ItemRow["conditionStatus"],
        warrantyDescription: "",
        technicalSpecs: {},
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!quoteCurrency) {
      showToast("Selecciona la moneda con la que estás cotizando este pedido.", "warning");
      return;
    }

    // Strip incomplete custom rows silently
    const validItems = items.filter((i) => !i.isCustom || i.materialName.trim() !== "");

    const hasAnyPrice = validItems.some((i) => Number(i.unitPrice) > 0);
    if (!hasAnyPrice) {
      showToast("Ingresa precio unitario para al menos un material.", "warning");
      return;
    }

    // Condición y garantía son obligatorias por línea (sin precarga) —
    // solo se exigen en líneas que efectivamente van a enviarse (precio > 0
    // o custom con nombre), no en materiales del proyecto que el proveedor
    // decidió no cotizar (unitPrice sigue en 0).
    const linesRequiringDetails = validItems.filter((i) => Number(i.unitPrice) > 0);
    const missingDetails = linesRequiringDetails.find((i) => !i.conditionStatus || !i.warrantyDescription?.trim());
    if (missingDetails) {
      showToast(`Completa condición y garantía para "${missingDetails.materialName || "el material personalizado"}".`, "warning");
      return;
    }

    // Valor y unidad de duración de garantía van juntos o ninguno — un
    // valor numérico sin unidad no tiene sentido (¿12 qué? ¿días, meses?).
    const missingWarrantyUnit = linesRequiringDetails.find((i) => Number(i.warrantyValue) > 0 && !i.warrantyUnit);
    if (missingWarrantyUnit) {
      showToast(`Selecciona la unidad de duración de garantía para "${missingWarrantyUnit.materialName || "el material personalizado"}".`, "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiFetch<{ id: string }>(`/public/invitations/${token}/proposal`, {
        method: "POST",
        body: JSON.stringify({
          quoteCurrency,
          estimatedDays: estimatedDays !== "" ? Number(estimatedDays) : null,
          durationUnit: estimatedDays !== "" ? durationUnit : null,
          advancePercent: advancePercent !== "" ? Number(advancePercent) : null,
          laborCost: laborCost !== "" ? Number(laborCost) : null,
          items: validItems.map((item) => ({
            materialName: sanitize(item.materialName).trim(),
            quantity: item.quantity === "" ? 0 : item.quantity,
            unit: sanitize(item.unit).trim(),
            unitPrice: item.unitPrice === "" ? 0 : item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes ? sanitize(item.notes).trim() : null,
            conditionStatus: item.conditionStatus || "new",
            catalogProductId: item.catalogProductId ?? null,
            technicalSpecs: Object.keys(item.technicalSpecs ?? {}).length > 0 ? item.technicalSpecs : null,
            warrantyDescription: item.warrantyDescription ? sanitize(item.warrantyDescription).trim() : "Sin garantía",
            warrantyValue: item.warrantyValue ?? null,
            warrantyUnit: item.warrantyUnit ?? null,
            imagePath: item.imagePath ?? null,
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
        <BackgroundDecor />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 flex flex-col items-center gap-3 text-slate-400"
        >
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-widest">Cargando propuesta…</span>
        </motion.div>
      </div>
    );
  }

  if (loadError || !invitation) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6 text-white">
        <BackgroundDecor />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 space-y-3 text-center"
        >
          <motion.span
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...springs.snappy, delay: 0.1 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500"
          >
            {loadError ? <AlertTriangle className="h-7 w-7" /> : <Package className="h-7 w-7" />}
          </motion.span>
          <h2 className="text-xl font-black text-slate-300">{loadError || "Enlace no disponible"}</h2>
          <p className="text-sm text-slate-500">Verifique el enlace recibido o contacte a IVOO.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white antialiased">
      <BackgroundDecor />

      <div className="relative z-10">
        <TopBar />

        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6"
        >
          <ProjectSummary invitation={invitation} />

          {submittedId ? (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-8 text-center"
            >
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springs.snappy, delay: 0.15 }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-400"
              >
                <CheckCircle2 className="h-9 w-9" strokeWidth={2.25} />
              </motion.span>
              <motion.h3
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-xl font-black text-emerald-300"
              >
                Propuesta enviada exitosamente
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.3 }}
                className="text-sm text-emerald-200/80"
              >
                Su cotización fue registrada con el código{" "}
                <span className="font-mono font-bold text-emerald-300">{submittedId}</span>.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.46, duration: 0.3 }}
                className="text-xs text-slate-400"
              >
                El equipo de IVOO revisará su propuesta y se comunicará con usted.
              </motion.p>
            </motion.div>
          ) : (
            <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-6">
              <OrderCurrencySelector currencies={currencies} value={quoteCurrency} onChange={setQuoteCurrency} />

              <MaterialsProposalCards
                token={token ?? ""}
                items={items}
                onUpdateItem={updateItem}
                onUpdateItemSpec={updateItemSpec}
                onAddCustomItem={addCustomItem}
                onRemoveItem={removeItem}
                categories={categories}
                currencyCode={quoteCurrency}
              />

              <ProposalDetailsSection
                estimatedDays={estimatedDays}
                onEstimatedDaysChange={setEstimatedDays}
                durationUnit={durationUnit}
                onDurationUnitChange={setDurationUnit}
                advancePercent={advancePercent}
                onAdvancePercentChange={setAdvancePercent}
                laborCost={laborCost}
                onLaborCostChange={setLaborCost}
                currencyCode={quoteCurrency}
                generalNotes={generalNotes}
                onGeneralNotesChange={setGeneralNotes}
                isSubmitting={isSubmitting}
              />
            </motion.form>
          )}
        </motion.main>

        <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs font-medium text-slate-600">
          IVOO Gestión de Infraestructura &copy; {new Date().getFullYear()} — Portal de Cotización de Materiales
        </footer>
      </div>
    </div>
  );
}
