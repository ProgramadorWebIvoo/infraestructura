import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface OfflineBannerProps {
  pendingCount: number;
  isProcessing: boolean;
  onProcessNow: () => void;
}

export default function OfflineBanner({ pendingCount, isProcessing, onProcessNow }: OfflineBannerProps) {
  if (pendingCount === 0 && !isProcessing) return null;

  const icon = isProcessing ? "sync-circle" : "cloud-upload";
  const bg = isProcessing ? "#fbbf24" : "#f97316";
  const label = isProcessing
    ? `Sincronizando ${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}…`
    : `${pendingCount} accione${pendingCount !== 1 ? "s" : ""} pendiente${pendingCount !== 1 ? "s" : ""} sin conexión`;

  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        <Ionicons name={icon} color="#ffffff" size={18} />
        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 12, flex: 1 }}>{label}</Text>
      </View>
      {!isProcessing && (
        <Pressable
          onPress={onProcessNow}
          style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 11 }}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}
