import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "./api";
import { useAuth } from "./hooks/useAuth";
import { useProjects } from "./hooks/useProjects";
import { useContractors } from "./hooks/useContractors";
import { useMaterials } from "./hooks/useMaterials";
import { useAuditLogs } from "./hooks/useAuditLogs";
import { useOfflineQueue } from "./hooks/useOfflineQueue";
import type { Screen, Project, Contractor } from "./types";

import AppShell from "./components/AppShell";
import OfflineBanner from "./components/OfflineBanner";
import NotificationHandler from "./components/NotificationHandler";
import LoginScreen from "./components/LoginScreen";
import PublicContractorScreen from "./components/PublicContractorScreen";
import PresidenciaScreen from "./components/PresidenciaScreen";
import InfraScreen from "./components/InfraScreen";
import CierreScreen from "./components/CierreScreen";
import ProcuraScreen from "./components/ProcuraScreen";
import AnalistasScreen from "./components/AnalistasScreen";
import FinanzasScreen from "./components/FinanzasScreen";
import ContractorsScreen from "./components/ContractorsScreen";
import ProjectModal from "./components/ProjectModal";
import StatsStrip from "./components/StatsStrip";
import styles from "./styles";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const Stack = createNativeStackNavigator();

function MainScreen() {
  const { token, user, login, logout } = useAuth();
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>("presidencia");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [], isFetching: projectsFetching } = useProjects(token);
  const { data: contractors = [], isFetching: contractorsFetching } = useContractors(token);
  const { data: materials = [] } = useMaterials(token);
  const { data: auditLogs = [] } = useAuditLogs(token);
  const { queueLength, isProcessing: queueProcessing, enqueue, processQueue } = useOfflineQueue(token);

  const handleNotificationTap = useCallback((data: { screen?: string; projectId?: string }) => {
    if (data.screen === "proveedores") {
      setScreen("proveedores");
    } else if (data.projectId) {
      const match = projects.find((p: Project) => p.id === data.projectId);
      if (match) setSelectedProject(match);
    }
  }, [projects]);

  const isRefreshing = projectsFetching || contractorsFetching;

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["contractors"] }),
      queryClient.invalidateQueries({ queryKey: ["materials"] }),
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] }),
    ]);
  };

  const invalidateAfterMutation = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["auditLogs"] }),
    ]);
  };

  const handleLogout = async () => {
    await logout();
    setScreen("presidencia");
  };

  const registerPublicContractor = async (payload: Pick<Contractor, "name" | "specialty" | "contact">) => {
    // Ruta pública (sin auth) — el backend asigna rating=4.0 por defecto,
    // no hay que hardcodearlo acá.
    const contractor = await requestJson<Contractor>(null, "/contractors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    queryClient.invalidateQueries({ queryKey: ["contractors"] });
    return contractor;
  };

  const execMutation = async (path: string, options: RequestInit = {}, description?: string) => {
    try {
      const json = await requestJson(token, path, options);
      const project: Project = json?.data ?? json;
      setSelectedProject((current) => (current?.id === project.id ? project : current));
      await invalidateAfterMutation();
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError || (error instanceof Error && /network|fetch/i.test(error.message));
      if (isNetworkError && token) {
        enqueue({
          path,
          method: options.method ?? "POST",
          body: options.body as string | undefined,
          description: description ?? path.split("/").pop() ?? path,
          invalidateKeys: [["projects"], ["auditLogs"]],
        });
      }
      // API errors (4xx/5xx) — silent, same as original syncProjectAction
    }
  };

  if (!token && screen !== "registro") {
    return (
      <AppShell screen={screen} setScreen={setScreen}>
        <LoginScreen onLogin={login} />
      </AppShell>
    );
  }

  return (
    <AppShell
      screen={screen}
      setScreen={setScreen}
      user={user}
      onLogout={token ? handleLogout : undefined}
      canUsePrivateScreens={Boolean(token)}
    >
      <NotificationHandler token={token} onNavigate={handleNotificationTap} />
      <OfflineBanner pendingCount={queueLength} isProcessing={queueProcessing} onProcessNow={processQueue} />
      {screen === "registro" ? (
        <PublicContractorScreen count={contractors.length} onRegister={registerPublicContractor} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} />}
          contentContainerStyle={styles.content}
        >
          <StatsStrip projects={projects} contractors={contractors} />
          {screen === "presidencia" && (
            <PresidenciaScreen projects={projects} auditLogs={auditLogs} onSelectProject={setSelectedProject} />
          )}
          {screen === "infraestructura" && (
            <InfraScreen
              projects={projects}
              materials={materials}
              onCreateProject={(body) =>
                execMutation("/projects", { method: "POST", body: JSON.stringify(body) })
              }
            />
          )}
          {screen === "cierre" && (
            <CierreScreen
              projects={projects}
              onReview={(projectId) =>
                execMutation(`/projects/${projectId}/review`, {
                  method: "POST",
                  body: JSON.stringify({
                    notes: "Revisión técnica registrada desde la app mobile.",
                    blueprintsCount: 1,
                    calculationsAdded: true,
                  }),
                })
              }
              onVerify={(project) =>
                execMutation(
                  `/projects/${project.id}/${project.status === "EN_EJECUCION" ? "report-finished" : "verify-completion"}`,
                  {
                    method: "POST",
                    body:
                      project.status === "EN_EJECUCION"
                        ? undefined
                        : JSON.stringify({ qualityVerified: true, details: "Certificado desde mobile." }),
                  },
                )
              }
            />
          )}
          {screen === "procura" && (
            <ProcuraScreen
              projects={projects}
              onApprove={(project) =>
                execMutation(`/projects/${project.id}/approve-investment`, {
                  method: "POST",
                  body: JSON.stringify({
                    notes: "Inversión aprobada desde mobile.",
                    approvedInvestmentAmount: project.estimatedTotal,
                  }),
                })
              }
              onSelectContractor={(project, proposal) =>
                execMutation(`/projects/${project.id}/select-contractor`, {
                  method: "POST",
                  body: JSON.stringify({ contractorCode: proposal.contractorCode, proposalId: proposal.id }),
                })
              }
            />
          )}
          {screen === "analistas" && (
            <AnalistasScreen
              projects={projects}
              contractors={contractors}
              onAddProposal={(project, contractor) =>
                execMutation(`/projects/${project.id}/proposals`, {
                  method: "POST",
                  body: JSON.stringify({
                    contractorCode: contractor.code,
                    materialCost: Math.max(project.estimatedTotal, 1),
                    laborCost: 800,
                    totalCost: Math.max(project.estimatedTotal, 1) + 800,
                    deliveryWeeks: 3,
                    negotiatedAdvancePercent: 30,
                    description: `Propuesta mobile para ${project.title}.`,
                  }),
                })
              }
              onSubmit={(project) => execMutation(`/projects/${project.id}/submit-comparative`, { method: "POST" })}
            />
          )}
          {screen === "finanzas" && (
            <FinanzasScreen
              projects={projects}
              onPay={(project, paymentType, amount) =>
                execMutation(`/projects/${project.id}/payments`, {
                  method: "POST",
                  body: JSON.stringify({ paymentType, amount }),
                })
              }
            />
          )}
          {screen === "proveedores" && <ContractorsScreen contractors={contractors} />}
        </ScrollView>
      )}
      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
