import React, { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { Contractor } from "../types";
import styles from "../styles";
import SectionTitle from "./SectionTitle";
import Field from "./Field";
import PrimaryButton from "./PrimaryButton";

export default function PublicContractorScreen({
  count,
  onRegister,
}: {
  count: number;
  onRegister: (payload: Pick<Contractor, "name" | "specialty" | "contact">) => Promise<Contractor>;
}) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !specialty.trim() || !contact.trim()) {
      Alert.alert("Faltan datos", "Completa todos los campos.");
      return;
    }

    setLoading(true);
    try {
      const contractor = await onRegister({ name, specialty, contact });
      Alert.alert("Registro recibido", `Código asignado: ${contractor.code}`);
      setName("");
      setSpecialty("");
      setContact("");
    } catch {
      Alert.alert("Error", "No se pudo registrar el proveedor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionTitle title="Registro público" subtitle={`${count} proveedores activos en catálogo`} />
      <View style={styles.formCard}>
        <Field label="Empresa" value={name} onChangeText={setName} />
        <Field label="Especialidad" value={specialty} onChangeText={setSpecialty} />
        <Field label="Correo" value={contact} onChangeText={setContact} keyboardType="email-address" />
        <PrimaryButton label={loading ? "Enviando..." : "Enviar registro"} icon="send" onPress={submit} disabled={loading} />
      </View>
    </ScrollView>
  );
}
