import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
} from "react-native";

import { API_BASE_URL } from "./config";
import { requestJson } from "./api";
import { useAuth } from "./hooks/useAuth";
import type { Screen, Project, Contractor, MaterialItem, AuditLog } from "./types";

import AppShell from "./components/AppShell";
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

export default function App() {
  const { token, user, login, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>("presidencia");
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projectsJson, contractorsJson, materialsJson, auditJson] = await Promise.all([
        requestJson(token, "/projects"),
        requestJson(token, "/contractors"),
        requestJson(token, "/materials"),
        requestJson(token, "/audit-logs"),
      ]);

      setProjects(projectsJson?.data ?? projectsJson);
      setContractors(contractorsJson?.data ?? contractorsJson);
      setMaterials(materialsJson?.data ?? materialsJson);
      setAuditLogs(auditJson?.data ?? auditJson);
    } catch (error) {
      console.error(error);
      Alert.alert("API no disponible", "No se pudo conectar con Laravel. Revisa la URL en mobile/App.tsx.");
    } finally {
      setIsLoading(false);
    }
  };

  const syncProjectAction = async (path: string, options: RequestInit = {}) => {
    const json = await requestJson(token, path, options);
    const project = json?.data ?? json;
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
    setSelectedProject((current) => (current?.id === project.id ? project : current));
    await loadAudit();
  };

  const loadAudit = async () => {
    try {
      const auditJson = await requestJson(token, "/audit-logs");
      setAuditLogs(auditJson?.data ?? auditJson);
    } catch {
      // Audit refresh is helpful, but should not block the main action.
    }
  };

  const handleLogout = async () => {
    await logout();
    setProjects([]);
    setContractors([]);
    setMaterials([]);
    setAuditLogs([]);
    setScreen("presidencia");
  };

  const registerPublicContractor = async (payload: Pick<Contractor, "name" | "specialty" | "contact">) => {
    const response = await fetch(`${API_BASE_URL}/contractors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...payload, rating: 4 }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const contractor = await response.json();
    setContractors((current) => [...current.filter((item) => item.code !== contractor.code), contractor]);
    return contractor as Contractor;
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
      {screen === "registro" ? (
        <PublicContractorScreen count={contractors.length} onRegister={registerPublicContractor} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
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
                syncProjectAction("/projects", { method: "POST", body: JSON.stringify(body) })
              }
            />
          )}
          {screen === "cierre" && (
            <CierreScreen
              projects={projects}
              onReview={(projectId) =>
                syncProjectAction(`/projects/${projectId}/review`, {
                  method: "POST",
                  body: JSON.stringify({
                    notes: "Revisión técnica registrada desde la app mobile.",
                    blueprintsCount: 1,
                    calculationsAdded: true,
                  }),
                })
              }
              onVerify={(project) =>
                syncProjectAction(
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
                syncProjectAction(`/projects/${project.id}/approve-investment`, {
                  method: "POST",
                  body: JSON.stringify({
                    notes: "Inversión aprobada desde mobile.",
                    approvedInvestmentAmount: project.estimatedTotal,
                  }),
                })
              }
              onSelectContractor={(project, proposal) =>
                syncProjectAction(`/projects/${project.id}/select-contractor`, {
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
                syncProjectAction(`/projects/${project.id}/proposals`, {
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
              onSubmit={(project) => syncProjectAction(`/projects/${project.id}/submit-comparative`, { method: "POST" })}
            />
          )}
          {screen === "finanzas" && (
            <FinanzasScreen
              projects={projects}
              onPay={(project, paymentType, amount) =>
                syncProjectAction(`/projects/${project.id}/payments`, {
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
