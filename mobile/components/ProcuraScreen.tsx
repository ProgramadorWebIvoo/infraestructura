import React from "react";
import { Pressable, Text, View } from "react-native";

import { Project, Proposal } from "../types";
import styles from "../styles";
import SectionTitle from "./SectionTitle";
import ProjectCard from "./ProjectCard";
import PrimaryButton from "./PrimaryButton";

export default function ProcuraScreen({
  projects,
  onApprove,
  onSelectContractor,
}: {
  projects: Project[];
  onApprove: (project: Project) => Promise<void>;
  onSelectContractor: (project: Project, proposal: Proposal) => Promise<void>;
}) {
  const visible = projects.filter((project) => ["REVISADO_CIERRE", "COMPARATIVA_ENVIADA"].includes(project.status));

  return (
    <View style={styles.section}>
      <SectionTitle title="Procura" subtitle="Presupuesto y adjudicación" />
      {visible.map((project) => (
        <ProjectCard key={project.id} project={project}>
          {project.status === "REVISADO_CIERRE" ? (
            <PrimaryButton label="Aprobar inversión" icon="checkmark-circle" onPress={() => onApprove(project)} />
          ) : (
            (project.proposals ?? []).map((proposal) => (
              <Pressable key={proposal.id} style={styles.secondaryButton} onPress={() => onSelectContractor(project, proposal)}>
                <Text style={styles.secondaryButtonText}>Adjudicar {proposal.contractorName}</Text>
              </Pressable>
            ))
          )}
        </ProjectCard>
      ))}
    </View>
  );
}
