import React, { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import styles from "../styles";
import Field from "./Field";
import PrimaryButton from "./PrimaryButton";

export default function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch {
      Alert.alert("Acceso denegado", "Correo o clave incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.centerContent}>
      <View style={styles.loginCard}>
        <View style={styles.logoBox}>
          <Ionicons name="business" color="#ffffff" size={24} />
        </View>
        <Text style={styles.loginTitle}>Acceso interno</Text>
        <Text style={styles.loginHint}>Conecta con el backend Laravel de infraestructura.</Text>
        <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Clave" value={password} onChangeText={setPassword} secureTextEntry />
        <PrimaryButton label={loading ? "Validando..." : "Ingresar"} icon="log-in" onPress={submit} disabled={loading} />
      </View>
    </ScrollView>
  );
}
