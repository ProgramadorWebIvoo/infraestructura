import React from "react";
import { View } from "react-native";

import { Project } from "../types";
import styles from "../styles";
import SectionTitle from "./SectionTitle";
import ProjectCard from "./ProjectCard";
import PrimaryButton from "./PrimaryButton";

export default function CierreScreen({
  projects,
  onReview,
  onVerify,
}: {
  projects: Project[];
  onReview: (projectId: string) => Promise<void>;
  onVerify: (project: Project) => Promise<void>;
}) {
  const visible = projects.filter((project) =>
    ["CREADO", "EN_EJECUCION", "VERIFICANDO_FINALIZACION"].includes(project.status),
  );

  return (
    <View style={styles.section}>
      <SectionTitle title="Cierre de Obra" subtitle="Revisión técnica y certificación" />
      {visible.map((project) => (
        <ProjectCard key={project.id} project={project}>
          {project.status === "CREADO" ? (
            <PrimaryButton label="Revisar técnicamente" icon="checkbox" onPress={() => onReview(project.id)} />
          ) : (
            <PrimaryButton label={project.status === "EN_EJECUCION" ? "Reportar fin" : "Certificar calidad"} icon="shield-checkmark" onPress={() => onVerify(project)} />
          )}
        </ProjectCard>
      ))}
    </View>
  );
}
