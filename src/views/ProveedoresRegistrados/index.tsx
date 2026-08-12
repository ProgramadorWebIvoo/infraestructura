/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ExternalLink, Users } from "lucide-react";
import type { Contractor, Project } from "../../types";
import { useToast } from "../../components/UI/Toast";
import { containerVariants, itemVariants } from "../../animations";
import { useProveedores } from "../../hooks/useProveedores";
import ContractorsSection from "./components/ContractorsSection";
import SupplierProposalsList from "./components/SupplierProposalsList";
import RatingModal from "./components/RatingModal";
import InviteModal from "./components/InviteModal";

interface ProveedoresRegistradosProps {
  contractors: Contractor[];
  projects: Project[];
  authToken: string;
  onUpdateContractorRating: (code: string, rating: number) => Promise<void>;
  isLoading?: boolean;
}

export default function ProveedoresRegistrados({
  contractors,
  projects,
  authToken,
  onUpdateContractorRating,
  isLoading = false,
}: ProveedoresRegistradosProps) {
  const { showToast } = useToast();
  const { proposals, isLoadingProposals, handleInviteSupplier } = useProveedores(authToken, showToast);

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

  return (
    <>
      <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 border-l-4 border-l-sky-400 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700">
              <Users className="h-3.5 w-3.5" />
              Base de proveedores
            </div>
            <h1 className="font-sans text-lg font-black tracking-tight text-slate-900">Proveedores registrados</h1>
            <p className="text-xs font-medium text-slate-500">
              Consulte las empresas recibidas desde el portal publico de registro.
            </p>
          </div>
          <Link
            id="link-open-public-provider-registration"
            to="/registro-proveedores"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all duration-200 hover:from-sky-700 hover:to-sky-600 hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir registro publico
          </Link>
        </motion.div>

        <ContractorsSection
          contractors={contractors}
          isLoading={isLoading}
          onOpenEdit={handleOpenEdit}
          onOpenInvite={handleOpenInviteModal}
        />

        <SupplierProposalsList proposals={proposals} isLoading={isLoadingProposals} />
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
      />
    </>
  );
}
