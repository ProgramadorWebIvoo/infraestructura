import React from "react";
import { View } from "react-native";

import { Project } from "../types";
import styles from "../styles";
import SectionTitle from "./SectionTitle";
import ProjectCard from "./ProjectCard";
import PrimaryButton from "./PrimaryButton";

export default function FinanzasScreen({
  projects,
  onPay,
}: {
  projects: Project[];
  onPay: (project: Project, paymentType: "ADVANCE" | "FINAL", amount: number) => Promise<void>;
}) {
  const visible = projects.filter((project) => ["CONTRATADO", "LISTO_PAGO_FINAL"].includes(project.status));

  return (
    <View style={styles.section}>
      <SectionTitle title="Finanzas" subtitle="Anticipos y liquidaciones" />
      {visible.map((project) => {
        const proposal = project.proposals?.find((item) => item.id === project.selectedProposalId);
        const amount = project.status === "CONTRATADO"
          ? ((proposal?.totalCost ?? project.estimatedTotal) * (proposal?.negotiatedAdvancePercent ?? 30)) / 100
          : Math.max((proposal?.totalCost ?? project.estimatedTotal) - (project.advancePaidAmount ?? 0), 0);

        return (
          <ProjectCard key={project.id} project={project}>
            <PrimaryButton
              label={project.status === "CONTRATADO" ? "Pagar anticipo" : "Pagar final"}
              icon="cash"
              onPress={() => onPay(project, project.status === "CONTRATADO" ? "ADVANCE" : "FINAL", amount)}
            />
          </ProjectCard>
        );
      })}
    </View>
  );
}
