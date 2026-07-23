import React, { useState } from "react";
import { Alert, Text, View } from "react-native";

import { Project, MaterialItem } from "../types";
import styles from "../styles";
import SectionTitle from "./SectionTitle";
import Field from "./Field";
import PrimaryButton from "./PrimaryButton";
import ProjectCard from "./ProjectCard";

export default function InfraScreen({
  projects,
  materials,
  onCreateProject,
}: {
  projects: Project[];
  materials: MaterialItem[];
  onCreateProject: (body: unknown) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const firstMaterial = materials[0] ?? { name: "Material general", unit: "Unidad", estimatedUnitPrice: 1 };

  const submit = async () => {
    if (!title.trim() || !location.trim() || !description.trim()) {
      Alert.alert("Faltan datos", "Completa título, ubicación y descripción.");
      return;
    }

    await onCreateProject({
      title,
      type: "INFRAESTRUCTURA",
      description,
      location,
      materials: [{ ...firstMaterial, quantity: 1 }],
      estimatedTotal: firstMaterial.estimatedUnitPrice,
    });
    setTitle("");
    setLocation("");
    setDescription("");
  };

  return (
    <View style={styles.section}>
      <SectionTitle title="Infraestructura" subtitle="Crear solicitudes y ver obras nuevas" />
      <View style={styles.formCard}>
        <Field label="Título" value={title} onChangeText={setTitle} />
        <Field label="Ubicación" value={location} onChangeText={setLocation} />
        <Field label="Descripción" value={description} onChangeText={setDescription} multiline />
        <Text style={styles.mutedText}>Material base: {firstMaterial.name}</Text>
        <PrimaryButton label="Crear obra" icon="add-circle" onPress={submit} />
      </View>
      {projects.filter((project) => project.status === "CREADO").map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </View>
  );
}
