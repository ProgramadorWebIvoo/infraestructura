import React from "react";
import { Text, View } from "react-native";

import { Project, AuditLog } from "../types";
import styles from "../styles";
import SectionTitle from "./SectionTitle";
import ProjectCard from "./ProjectCard";

export default function PresidenciaScreen({
  projects,
  auditLogs,
  onSelectProject,
}: {
  projects: Project[];
  auditLogs: AuditLog[];
  onSelectProject: (project: Project) => void;
}) {
  return (
    <View style={styles.section}>
      <SectionTitle title="Presidencia" subtitle="Vista ejecutiva y trazabilidad" />
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onPress={() => onSelectProject(project)} />
      ))}
      <Text style={styles.sectionSmallTitle}>Auditoría reciente</Text>
      {auditLogs.slice(0, 8).map((log) => (
        <View key={log.id} style={styles.auditItem}>
          <Text style={styles.auditAction}>{log.action}</Text>
          <Text style={styles.mutedText}>{log.projectTitle} • {log.timestamp}</Text>
        </View>
      ))}
    </View>
  );
}
