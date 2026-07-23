import React from "react";
import { Text, View } from "react-native";

import { Contractor } from "../types";
import styles from "../styles";
import SectionTitle from "./SectionTitle";

export default function ContractorsScreen({ contractors }: { contractors: Contractor[] }) {
  return (
    <View style={styles.section}>
      <SectionTitle title="Proveedores" subtitle="Catálogo conectado a Laravel" />
      {contractors.map((contractor) => (
        <View key={contractor.code} style={styles.card}>
          <Text style={styles.cardTitle}>{contractor.name}</Text>
          <Text style={styles.mutedText}>{contractor.code} • {contractor.specialty}</Text>
          <Text style={styles.mutedText}>{contractor.contact}</Text>
        </View>
      ))}
    </View>
  );
}
