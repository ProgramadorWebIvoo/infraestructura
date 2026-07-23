import React from "react";
import { View } from "react-native";

import { Project, Contractor } from "../types";
import styles from "../styles";
import StatCard from "./StatCard";

export default function StatsStrip({ projects, contractors }: { projects: Project[]; contractors: Contractor[] }) {
  const completed = projects.filter((project) => project.status === "COMPLETADO_PAGADO").length;
  const active = projects.filter((project) => project.status !== "CREADO" && project.status !== "COMPLETADO_PAGADO").length;

  return (
    <View style={styles.statsRow}>
      <StatCard label="Obras" value={projects.length.toString()} />
      <StatCard label="Activas" value={active.toString()} />
      <StatCard label="Pagadas" value={completed.toString()} />
      <StatCard label="Proveedores" value={contractors.length.toString()} />
    </View>
  );
}
