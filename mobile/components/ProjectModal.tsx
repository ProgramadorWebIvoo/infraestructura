import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Project, statusLabels } from "../types";
import styles from "../styles";

export default function ProjectModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  if (!project) return null;

  return (
    <Modal animationType="slide" visible={true} transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{project.title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" color="#e2e8f0" size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.badge}>{project.id} • {statusLabels[project.status]}</Text>
            <Text style={styles.detailText}>{project.description}</Text>
            <Text style={styles.detailText}>Ubicación: {project.location}</Text>
            <Text style={styles.detailText}>Estimado: ${project.estimatedTotal.toLocaleString()}</Text>
            <Text style={styles.sectionSmallTitle}>Materiales</Text>
            {project.materials.map((material) => (
              <Text key={material.id ?? material.name} style={styles.mutedText}>
                {material.quantity} {material.unit} • {material.name}
              </Text>
            ))}
            <Text style={styles.sectionSmallTitle}>Propuestas</Text>
            {(project.proposals ?? []).map((proposal) => (
              <Text key={proposal.id} style={styles.mutedText}>
                {proposal.contractorName}: ${proposal.totalCost.toLocaleString()}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
