import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE_URL } from "./config";

type ProjectStatus =
  | "CREADO"
  | "REVISADO_CIERRE"
  | "CONFIRMADO_PROCURA"
  | "COMPARATIVA_ENVIADA"
  | "CONTRATADO"
  | "EN_EJECUCION"
  | "VERIFICANDO_FINALIZACION"
  | "LISTO_PAGO_FINAL"
  | "COMPLETADO_PAGADO";

type MaterialItem = {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
};

type Proposal = {
  id: string;
  contractorCode: string;
  contractorName: string;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  deliveryWeeks: number;
  negotiatedAdvancePercent: number;
  description: string;
};

type Project = {
  id: string;
  title: string;
  type: "INFRAESTRUCTURA" | "MANTENIMIENTO";
  description: string;
  location: string;
  createdDate: string;
  status: ProjectStatus;
  materials: MaterialItem[];
  estimatedTotal: number;
  cierreObraNotes?: string | null;
  calculationsAdded?: boolean;
  blueprintsCount?: number;
  procuraReviewNotes?: string | null;
  approvedInvestmentAmount?: number | null;
  proposals?: Proposal[];
  selectedContractorCode?: string | null;
  selectedProposalId?: string | null;
  advancePaidAmount?: number | null;
  advancePaidDate?: string | null;
  finalPaidAmount?: number | null;
  finalPaidDate?: string | null;
  qualityVerified?: boolean;
  completionVerifiedDate?: string | null;
};

type Contractor = {
  code: string;
  name: string;
  specialty: string;
  rating: number;
  contact: string;
  status?: string;
};

type AuditLog = {
  id: string;
  projectId: string;
  projectTitle: string;
  role: string;
  action: string;
  timestamp: string;
  details?: string;
};

type Screen =
  | "presidencia"
  | "infraestructura"
  | "cierre"
  | "procura"
  | "analistas"
  | "finanzas"
  | "proveedores"
  | "registro";

const screens: Array<{ key: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "presidencia", label: "Presidencia", icon: "trending-up" },
  { key: "infraestructura", label: "Infra", icon: "business" },
  { key: "cierre", label: "Cierre", icon: "checkbox" },
  { key: "procura", label: "Procura", icon: "search" },
  { key: "analistas", label: "Analistas", icon: "people" },
  { key: "finanzas", label: "Finanzas", icon: "cash" },
  { key: "proveedores", label: "Proveedores", icon: "construct" },
  { key: "registro", label: "Registro", icon: "person-add" },
];

const statusLabels: Record<ProjectStatus, string> = {
  CREADO: "Creado",
  REVISADO_CIERRE: "Revisado",
  CONFIRMADO_PROCURA: "Procura OK",
  COMPARATIVA_ENVIADA: "Comparativa",
  CONTRATADO: "Contratado",
  EN_EJECUCION: "Ejecución",
  VERIFICANDO_FINALIZACION: "Verificando",
  LISTO_PAGO_FINAL: "Pago final",
  COMPLETADO_PAGADO: "Completado",
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("presidencia");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const authHeaders = useMemo(
    () => ({ Accept: "application/json", Authorization: `Bearer ${token}` }),
    [token],
  );

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const requestJson = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
         "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    if (response.status === 204) return null;
    return response.json();
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [projectsJson, contractorsJson, materialsJson, auditJson] = await Promise.all([
        requestJson("/projects"),
        requestJson("/contractors"),
        requestJson("/materials"),
        requestJson("/audit-logs"),
      ]);

      setProjects(projectsJson.data ?? projectsJson);
      setContractors(contractorsJson.data ?? contractorsJson);
      setMaterials(materialsJson.data ?? materialsJson);
      setAuditLogs(auditJson.data ?? auditJson);
    } catch (error) {
      console.error(error);
      Alert.alert("API no disponible", "No se pudo conectar con Laravel. Revisa la URL en mobile/App.tsx.");
    } finally {
      setIsLoading(false);
    }
  };

  const syncProjectAction = async (path: string, options: RequestInit = {}) => {
    const json = await requestJson(path, options);
    const project = json.data ?? json;
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
    setSelectedProject((current) => (current?.id === project.id ? project : current));
    await loadAudit();
  };

  const loadAudit = async () => {
    try {
      const auditJson = await requestJson("/audit-logs");
      setAuditLogs(auditJson.data ?? auditJson);
    } catch {
      // Audit refresh is helpful, but should not block the main action.
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Credenciales inválidas");
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    if (token) {
      await fetch(`${API_BASE_URL}/logout`, { method: "POST", headers: authHeaders }).catch(() => null);
    }
    setToken("");
    setUser(null);
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
      onLogout={token ? logout : undefined}
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

function AppShell({
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

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
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

function StatsStrip({ projects, contractors }: { projects: Project[]; contractors: Contractor[] }) {
  const completed = projects.filter((project) => project.status === "COMPLETADO_PAGADO").length;
  const active = projects.filter((project) => project.status !== "CREADO" && project.status !== "COMPLETADO_PAGADO").length;

  return (
    <View style={styles.statsRow}>
      <StatCard label="Obras" value={projects.length.toString()} />
      <StatCard label="Activas" value={active.toString()} />
      <StatCard label="Pagadas" value={completed.toString()} />
      <StatCard label="Proveedores" value={contractors.length.toString()} />
    </View>
  );
}

function PresidenciaScreen({
  projects,
  auditLogs,
  onSelectProject,
}: {
  projects: Project[];
  auditLogs: AuditLog[];
  onSelectProject: (project: Project) => void;
}) {
  return (
    <View style={styles.section}>
      <SectionTitle title="Presidencia" subtitle="Vista ejecutiva y trazabilidad" />
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onPress={() => onSelectProject(project)} />
      ))}
      <Text style={styles.sectionSmallTitle}>Auditoría reciente</Text>
      {auditLogs.slice(0, 8).map((log) => (
        <View key={log.id} style={styles.auditItem}>
          <Text style={styles.auditAction}>{log.action}</Text>
          <Text style={styles.mutedText}>{log.projectTitle} • {log.timestamp}</Text>
        </View>
      ))}
    </View>
  );
}

function InfraScreen({
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

function CierreScreen({
  projects,
  onReview,
  onVerify,
}: {
  projects: Project[];
  onReview: (projectId: string) => Promise<void>;
  onVerify: (project: Project) => Promise<void>;
}) {
  const visible = projects.filter((project) =>
    ["CREADO", "EN_EJECUCION", "VERIFICANDO_FINALIZACION"].includes(project.status),
  );

  return (
    <View style={styles.section}>
      <SectionTitle title="Cierre de Obra" subtitle="Revisión técnica y certificación" />
      {visible.map((project) => (
        <ProjectCard key={project.id} project={project}>
          {project.status === "CREADO" ? (
            <PrimaryButton label="Revisar técnicamente" icon="checkbox" onPress={() => onReview(project.id)} />
          ) : (
            <PrimaryButton label={project.status === "EN_EJECUCION" ? "Reportar fin" : "Certificar calidad"} icon="shield-checkmark" onPress={() => onVerify(project)} />
          )}
        </ProjectCard>
      ))}
    </View>
  );
}

function ProcuraScreen({
  projects,
  onApprove,
  onSelectContractor,
}: {
  projects: Project[];
  onApprove: (project: Project) => Promise<void>;
  onSelectContractor: (project: Project, proposal: Proposal) => Promise<void>;
}) {
  const visible = projects.filter((project) => ["REVISADO_CIERRE", "COMPARATIVA_ENVIADA"].includes(project.status));

  return (
    <View style={styles.section}>
      <SectionTitle title="Procura" subtitle="Presupuesto y adjudicación" />
      {visible.map((project) => (
        <ProjectCard key={project.id} project={project}>
          {project.status === "REVISADO_CIERRE" ? (
            <PrimaryButton label="Aprobar inversión" icon="checkmark-circle" onPress={() => onApprove(project)} />
          ) : (
            (project.proposals ?? []).map((proposal) => (
              <Pressable key={proposal.id} style={styles.secondaryButton} onPress={() => onSelectContractor(project, proposal)}>
                <Text style={styles.secondaryButtonText}>Adjudicar {proposal.contractorName}</Text>
              </Pressable>
            ))
          )}
        </ProjectCard>
      ))}
    </View>
  );
}

function AnalistasScreen({
  projects,
  contractors,
  onAddProposal,
  onSubmit,
}: {
  projects: Project[];
  contractors: Contractor[];
  onAddProposal: (project: Project, contractor: Contractor) => Promise<void>;
  onSubmit: (project: Project) => Promise<void>;
}) {
  const visible = projects.filter((project) => project.status === "CONFIRMADO_PROCURA");
  const contractor = contractors[0];

  return (
    <View style={styles.section}>
      <SectionTitle title="Analistas" subtitle="Carga rápida de propuestas" />
      {visible.map((project) => (
        <ProjectCard key={project.id} project={project}>
          {contractor && (
            <PrimaryButton label={`Agregar propuesta ${contractor.code}`} icon="document-text" onPress={() => onAddProposal(project, contractor)} />
          )}
          {(project.proposals?.length ?? 0) > 0 && (
            <Pressable style={styles.secondaryButton} onPress={() => onSubmit(project)}>
              <Text style={styles.secondaryButtonText}>Enviar comparativa</Text>
            </Pressable>
          )}
        </ProjectCard>
      ))}
    </View>
  );
}

function FinanzasScreen({
  projects,
  onPay,
}: {
  projects: Project[];
  onPay: (project: Project, paymentType: "ADVANCE" | "FINAL", amount: number) => Promise<void>;
}) {
  const visible = projects.filter((project) => ["CONTRATADO", "LISTO_PAGO_FINAL"].includes(project.status));

  return (
    <View style={styles.section}>
      <SectionTitle title="Finanzas" subtitle="Anticipos y liquidaciones" />
      {visible.map((project) => {
        const proposal = project.proposals?.find((item) => item.id === project.selectedProposalId);
        const amount = project.status === "CONTRATADO"
          ? ((proposal?.totalCost ?? project.estimatedTotal) * (proposal?.negotiatedAdvancePercent ?? 30)) / 100
          : Math.max((proposal?.totalCost ?? project.estimatedTotal) - (project.advancePaidAmount ?? 0), 0);

        return (
          <ProjectCard key={project.id} project={project}>
            <PrimaryButton
              label={project.status === "CONTRATADO" ? "Pagar anticipo" : "Pagar final"}
              icon="cash"
              onPress={() => onPay(project, project.status === "CONTRATADO" ? "ADVANCE" : "FINAL", amount)}
            />
          </ProjectCard>
        );
      })}
    </View>
  );
}

function ContractorsScreen({ contractors }: { contractors: Contractor[] }) {
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

function PublicContractorScreen({
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

function ProjectModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
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

function ProjectCard({ project, children, onPress }: { project: Project; children?: React.ReactNode; onPress?: () => void }) {
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

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.textArea]}
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        multiline={props.multiline}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.primaryButton, disabled && styles.disabledButton]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} color="#ffffff" size={17} />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: "#0f172a",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  headerButton: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerButtonText: {
    color: "#e2e8f0",
    fontWeight: "800",
    fontSize: 12,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  loginCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
  },
  loginHint: {
    color: "#64748b",
    fontWeight: "600",
    marginTop: 4,
    marginBottom: 18,
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 10,
  },
  tabContent: {
    paddingHorizontal: 10,
    gap: 8,
  },
  tabItem: {
    minWidth: 86,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  tabItemActive: {
    backgroundColor: "#0ea5e9",
  },
  tabLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3,
  },
  tabLabelActive: {
    color: "#ffffff",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statValue: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
  },
  section: {
    gap: 12,
  },
  sectionTitleWrap: {
    marginBottom: 4,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  sectionSmallTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  mutedText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  detailText: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  priceText: {
    color: "#0284c7",
    fontSize: 15,
    fontWeight: "900",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: "900",
  },
  cardActions: {
    gap: 8,
    marginTop: 4,
  },
  auditItem: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  auditAction: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#0f172a",
    fontWeight: "700",
    backgroundColor: "#ffffff",
  },
  textArea: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#bae6fd",
    backgroundColor: "#f0f9ff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: "#0369a1",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    maxHeight: "86%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  modalHeader: {
    backgroundColor: "#0f172a",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
    paddingRight: 10,
  },
  modalBody: {
    padding: 16,
    gap: 10,
  },
});
