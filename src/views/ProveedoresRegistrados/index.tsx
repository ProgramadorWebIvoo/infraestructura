/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Proveedores: base de contratistas registrados + propuestas de materiales
 * recibidas por el portal público, en dos tabs (mismo patrón de Tabs+TabPanel
 * que ProcuraPanel/InfraestructuraMantenimientoPanel) en vez de dos secciones
 * apiladas en scroll — separa dos flujos de trabajo distintos (gestionar la
 * base de proveedores vs. revisar cotizaciones) que antes competían por
 * atención en la misma pantalla.
 */

import { useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Package, PackageSearch, Star, Users } from "lucide-react";
import type { CatalogProduct, Contractor, Project } from "../../types";
import { useToast } from "../../components/UI/Toast";
import { containerVariants, itemVariants } from "../../animations";
import { useProveedores } from "../../hooks/useProveedores";
import { useCatalogProducts } from "../../hooks/useCatalogProducts";
import { useBaseCurrency } from "../../hooks/useBaseCurrency";
import KpiPill from "../../components/UI/KpiPill";
import Tabs from "../../components/UI/Tabs";
import TabPanel from "../../components/UI/TabPanel";
import ContractorsSection from "./components/ContractorsSection";
import SupplierProposalsList from "./components/SupplierProposalsList";
import CatalogSection from "./components/CatalogSection";
import CatalogProductDetailModal from "./components/CatalogProductDetailModal";
import RatingModal from "./components/RatingModal";
import InviteModal from "./components/InviteModal";

interface ProveedoresRegistradosProps {
  contractors: Contractor[];
  projects: Project[];
  authToken: string;
  onUpdateContractorRating: (code: string, rating: number) => Promise<void>;
  isLoading?: boolean;
}

type TabKey = "contractors" | "proposals" | "catalog";

export default function ProveedoresRegistrados({
  contractors,
  projects,
  authToken,
  onUpdateContractorRating,
  isLoading = false,
}: ProveedoresRegistradosProps) {
  const { showToast } = useToast();
  const { proposals, isLoadingProposals, handleInviteSupplier, fetchLatestInvitation } = useProveedores(authToken, showToast);
  const { products, isLoadingProducts, categories } = useCatalogProducts(authToken, showToast);
  const { baseCurrency, convertFromUsd } = useBaseCurrency(authToken);
  const [activeTab, setActiveTab] = useState<TabKey>("contractors");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);

  // Un solo estado discriminado en vez de dos independientes: evita que
  // rating e invite queden abiertos a la vez (dos modales superpuestos con
  // el mismo z-index) si el usuario clickea ambas acciones sin cerrar la
  // primera.
  type ActiveModal = { type: "rating" | "invite"; contractor: Contractor } | null;
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const handleOpenEdit = useCallback((contractor: Contractor) => {
    setActiveModal({ type: "rating", contractor });
  }, []);

  const handleOpenInviteModal = useCallback((contractor: Contractor) => {
    setActiveModal({ type: "invite", contractor });
  }, []);

  const closeModal = useCallback(() => setActiveModal(null), []);

  const avgRating = useMemo(() => {
    if (contractors.length === 0) return 0;
    return contractors.reduce((sum, c) => sum + c.rating, 0) / contractors.length;
  }, [contractors]);

  return (
    <>
      <motion.div className="flex min-h-0 flex-col gap-4" style={{ height: "calc(100vh - 3rem)" }} variants={containerVariants} initial="hidden" animate="visible">
        <h1 className="sr-only">Proveedores</h1>

        {/* ── KPIs operativos + acceso al registro público — contexto secundario
            compacto, mismo patrón que ProcuraPanel/InfraestructuraMantenimientoPanel
            (ninguna vista fuera de CONFIG APP usa SectionHeader a este nivel). ── */}
        <motion.div variants={itemVariants} className="shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <KpiPill icon={<Users className="h-3.5 w-3.5" />} label="Proveedores" value={contractors.length} accent="brand" />
            <KpiPill icon={<Star className="h-3.5 w-3.5" />} label="Rating Promedio" value={avgRating.toFixed(1)} accent="warning" />
            <KpiPill icon={<Package className="h-3.5 w-3.5" />} label="Propuestas Recibidas" value={proposals.length} accent="info" />
          </div>
          <a
            id="link-open-public-provider-registration"
            href="/registro-proveedores"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all duration-200 hover:from-sky-700 hover:to-sky-600 hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir registro público
          </a>
        </motion.div>

        {/* ── Tabs: dos flujos de trabajo independientes ── */}
        <motion.div variants={itemVariants} className="shrink-0">
          <Tabs
            ariaLabel="Secciones de Proveedores"
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            fullWidth
            tabs={[
              { key: "contractors", label: "Proveedores Registrados", count: contractors.length },
              { key: "proposals", label: "Propuestas de Materiales", count: proposals.length },
              { key: "catalog", label: "Catálogo Maestro", count: products.length },
            ]}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="min-h-0 flex flex-col flex-1">
          <TabPanel activeKey={activeTab}>
            {activeTab === "contractors" && (
              <ContractorsSection
                contractors={contractors}
                isLoading={isLoading}
                onOpenEdit={handleOpenEdit}
                onOpenInvite={handleOpenInviteModal}
              />
            )}
            {activeTab === "proposals" && (
              <SupplierProposalsList proposals={proposals} isLoading={isLoadingProposals} />
            )}
            {activeTab === "catalog" && (
              <CatalogSection
                products={products}
                categories={categories}
                isLoading={isLoadingProducts}
                onOpenProduct={setSelectedProduct}
                baseCurrency={baseCurrency}
                convertFromUsd={convertFromUsd}
              />
            )}
          </TabPanel>
        </motion.div>
      </motion.div>

      <RatingModal
        contractor={activeModal?.type === "rating" ? activeModal.contractor : null}
        onClose={closeModal}
        onSave={onUpdateContractorRating}
      />

      <InviteModal
        contractor={activeModal?.type === "invite" ? activeModal.contractor : null}
        projects={projects}
        onClose={closeModal}
        onInvite={handleInviteSupplier}
        onFetchLatest={fetchLatestInvitation}
      />

      <CatalogProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        baseCurrency={baseCurrency}
        convertFromUsd={convertFromUsd}
      />
    </>
  );
}
