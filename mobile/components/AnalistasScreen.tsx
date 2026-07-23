import React from "react";
import { Pressable, Text, View } from "react-native";

import { Project, Contractor } from "../types";
import styles from "../styles";
import SectionTitle from "./SectionTitle";
import ProjectCard from "./ProjectCard";
import PrimaryButton from "./PrimaryButton";

export default function AnalistasScreen({
  projects,
  contractors,
  onAddProposal,
  onSubmit,
}: {
  projects: Project[];
  contractors: Contractor[];
  onAddProposal: (project: Project, contractor: Contractor) => Promise<void>;
  onSubmit: (project: Project) => Promise<void>;
}) {
  const visible = projects.filter((project) => project.status === "CONFIRMADO_PROCURA");
  const contractor = contractors[0];

  return (
    <View style={styles.section}>
      <SectionTitle title="Analistas" subtitle="Carga rápida de propuestas" />
      {visible.map((project) => (
        <ProjectCard key={project.id} project={project}>
          {contractor && (
            <PrimaryButton label={`Agregar propuesta ${contractor.code}`} icon="document-text" onPress={() => onAddProposal(project, contractor)} />
          )}
          {(project.proposals?.length ?? 0) > 0 && (
            <Pressable style={styles.secondaryButton} onPress={() => onSubmit(project)}>
              <Text style={styles.secondaryButtonText}>Enviar comparativa</Text>
            </Pressable>
          )}
        </ProjectCard>
      ))}
    </View>
  );
}
