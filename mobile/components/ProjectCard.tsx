import React from "react";
import { Pressable, Text, View } from "react-native";

import { Project, statusLabels } from "../types";
import styles from "../styles";

export default function ProjectCard({ project, children, onPress }: { project: Project; children?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{project.title}</Text>
          <Text style={styles.mutedText}>{project.id} • {project.location}</Text>
        </View>
        <Text style={styles.badge}>{statusLabels[project.status]}</Text>
      </View>
      <Text style={styles.detailText} numberOfLines={2}>{project.description}</Text>
      <Text style={styles.priceText}>${project.estimatedTotal.toLocaleString()}</Text>
      {children && <View style={styles.cardActions}>{children}</View>}
    </Pressable>
  );
}
