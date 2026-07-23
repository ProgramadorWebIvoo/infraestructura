import React from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { screens, Screen } from "../types";
import styles from "../styles";

export default function AppShell({
  children,
  screen,
  setScreen,
  user,
  onLogout,
  canUsePrivateScreens = true,
}: {
  children: React.ReactNode;
  screen: Screen;
  setScreen: (screen: Screen) => void;
  user?: { name: string; email: string } | null;
  onLogout?: () => void;
  canUsePrivateScreens?: boolean;
}) {
  const visibleScreens = screens.filter((item) => canUsePrivateScreens || item.key === "registro");

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>IVOO Gestión</Text>
          <Text style={styles.subtitle}>{user?.email ?? "Infraestructura mobile"}</Text>
        </View>
        {onLogout && (
          <Pressable style={styles.headerButton} onPress={onLogout}>
            <Ionicons name="log-out-outline" color="#e2e8f0" size={18} />
            <Text style={styles.headerButtonText}>Salir</Text>
          </Pressable>
        )}
      </View>
      {children}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          {visibleScreens.map((item) => {
            const active = item.key === screen;
            return (
              <Pressable
                key={item.key}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setScreen(item.key)}
              >
                <Ionicons name={item.icon} size={16} color={active ? "#ffffff" : "#64748b"} />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
