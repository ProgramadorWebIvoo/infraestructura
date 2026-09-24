/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AwardApprovalsSection from "@/views/PresidenciaDashboard/components/AwardApprovalsSection";
import SendToFinanceSection from "@/views/ProcuraPanel/components/SendToFinanceSection";
import { ProjectStatus } from "@/types";
import type { Project } from "@/types";

function makeProject(id: string, status: string): Project {
  return {
    id,
    title: `Obra ${id}`,
    description: "desc",
    location: "Valencia",
    status,
    selectedContractorCode: "C-1",
    selectedProposalId: `P-${id}`,
    proposals: [{ id: `P-${id}`, contractorCode: "C-1", contractorName: "Constructora Uno", totalCost: 1000 }],
  } as unknown as Project;
}

describe("AwardApprovalsSection", () => {
  it("lista solo obras pendientes de Presidencia", () => {
    render(
      <AwardApprovalsSection
        projects={[makeProject("A", ProjectStatus.PENDIENTE_PRESIDENCIA), makeProject("B", ProjectStatus.COMPARATIVA_ENVIADA)]}
        onApproveAward={vi.fn()}
        onRejectAward={vi.fn()}
      />,
    );
    expect(screen.getByText("Obra A")).toBeInTheDocument();
    expect(screen.queryByText("Obra B")).not.toBeInTheDocument();
  });

  it("aprueba varias obras en bloque", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn().mockResolvedValue(undefined);
    render(
      <AwardApprovalsSection
        projects={[makeProject("A", ProjectStatus.PENDIENTE_PRESIDENCIA), makeProject("B", ProjectStatus.PENDIENTE_PRESIDENCIA)]}
        onApproveAward={onApprove}
        onRejectAward={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Seleccionar Obra A" }));
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar Obra B" }));
    await user.click(screen.getByRole("button", { name: /Aprobar seleccionadas \(2\)/ }));

    await waitFor(() => expect(onApprove).toHaveBeenCalledWith(["A", "B"]));
  });

  it("exige motivo para rechazar", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn().mockResolvedValue(undefined);
    render(
      <AwardApprovalsSection projects={[makeProject("A", ProjectStatus.PENDIENTE_PRESIDENCIA)]} onApproveAward={vi.fn()} onRejectAward={onReject} />,
    );

    await user.click(screen.getByRole("button", { name: /^Rechazar$/ }));
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: /Rechazar y devolver a Procura/ });
    expect(confirm).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/Motivo del rechazo/), "Monto excesivo");
    await user.click(confirm);

    await waitFor(() => expect(onReject).toHaveBeenCalledWith("A", "Monto excesivo"));
  });
});

describe("SendToFinanceSection", () => {
  it("muestra solo obras aprobadas y envía a Finanzas", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <SendToFinanceSection
        projects={[makeProject("A", ProjectStatus.APROBADO_PRESIDENCIA), makeProject("B", ProjectStatus.PENDIENTE_PRESIDENCIA)]}
        onSendToFinance={onSend}
      />,
    );

    expect(screen.queryByText("Obra B")).not.toBeInTheDocument();
    expect(screen.getByText(/1 adjudicación\(es\) esperan/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Enviar a Finanzas/ }));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith("A"));
  });
});
