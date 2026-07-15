/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, ProjectStatus, Contractor, AuditLog } from "./types";

export const INITIAL_CONTRACTORS: Contractor[] = [
  {
    code: "CON-301",
    name: "Constructora Andes C.A.",
    specialty: "Obras Civiles y Estructuras",
    rating: 4.8,
    contact: "contacto@constandes.com",
  },
  {
    code: "CON-302",
    name: "Sistemas Eléctricos Voltio, S.A.",
    specialty: "Alta Tensión e Iluminación",
    rating: 4.5,
    contact: "proyectos@voltiosa.com",
  },
  {
    code: "CON-303",
    name: "Mantenimiento Integral Express",
    specialty: "Pintura, Drywall y Acabados",
    rating: 4.2,
    contact: "gerencia@mantexpress.net",
  },
  {
    code: "CON-304",
    name: "Tuberías y Soldaduras Occidente",
    specialty: "Sistemas de Enfriamiento e Hidráulicos",
    rating: 4.7,
    contact: "ventas@tuboccidente.com",
  },
  {
    code: "CON-305",
    name: "Soluciones de Climatización Termo-Control",
    specialty: "Aire Acondicionado y Ventilación",
    rating: 4.6,
    contact: "soporte@termocontrol.ve",
  }
];

export const MATERIAL_CATALOG = [
  { name: "Cemento Portland (Saco 42.5kg)", unit: "Saco", estimatedUnitPrice: 12.5 },
  { name: "Acero de Refuerzo 1/2 pulgada", unit: "Cabilla", estimatedUnitPrice: 18.0 },
  { name: "Bloque de Arcilla de 15cm", unit: "Millar", estimatedUnitPrice: 450.0 },
  { name: "Arena Lavada para Concreto", unit: "m³", estimatedUnitPrice: 35.0 },
  { name: "Piedra Picada para Mezcla", unit: "m³", estimatedUnitPrice: 40.0 },
  { name: "Cable de Cobre THHN #10 AWG", unit: "Rollo (100m)", estimatedUnitPrice: 110.0 },
  { name: "Lámpara LED Industrial 150W", unit: "Unidad", estimatedUnitPrice: 55.0 },
  { name: "Pintura de Caucho Profesional (Cuñete)", unit: "Cuñete", estimatedUnitPrice: 85.0 },
  { name: "Tubo de PVC de Agua 3 pulgadas", unit: "Tubo (6m)", estimatedUnitPrice: 22.0 },
  { name: "Tablero Eléctrico Principal de 24 Circuitos", unit: "Unidad", estimatedUnitPrice: 320.0 }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "PRJ-001",
    title: "Optimización de Planta de Enfriamiento Sede Norte",
    type: "INFRAESTRUCTURA",
    description: "Sustitución de tuberías de refrigeración oxidadas y optimización de bombas de agua helada para los chillers principales.",
    location: "Sede Principal Norte",
    createdDate: "2026-06-20",
    status: ProjectStatus.CREADO,
    materials: [
      { id: "m1", name: "Tubo de PVC de Agua 3 pulgadas", quantity: 24, unit: "Tubo (6m)", estimatedUnitPrice: 22.0 },
      { id: "m2", name: "Piedra Picada para Mezcla", quantity: 5, unit: "m³", estimatedUnitPrice: 40.0 },
      { id: "m3", name: "Cemento Portland (Saco 42.5kg)", quantity: 15, unit: "Saco", estimatedUnitPrice: 12.5 }
    ],
    estimatedTotal: 915.5 // sum of materials + base budget
  },
  {
    id: "PRJ-002",
    title: "Mantenimiento General y Pintura de Fachada IVOO",
    type: "MANTENIMIENTO",
    description: "Reparación de grietas superficiales en fachada externa y aplicación de pintura de alta resistencia para intemperie.",
    location: "Tienda IVOO Valencia",
    createdDate: "2026-06-15",
    status: ProjectStatus.COMPARATIVA_ENVIADA,
    materials: [
      { id: "m4", name: "Pintura de Caucho Profesional (Cuñete)", quantity: 12, unit: "Cuñete", estimatedUnitPrice: 85.0 },
      { id: "m5", name: "Cemento Portland (Saco 42.5kg)", quantity: 8, unit: "Saco", estimatedUnitPrice: 12.5 },
      { id: "m6", name: "Arena Lavada para Concreto", quantity: 3, unit: "m³", estimatedUnitPrice: 35.0 }
    ],
    estimatedTotal: 1225.0,
    cierreObraNotes: "Se validaron los cálculos de área de fachada (1200 m²). Requiere andamios de seguridad y equipo de arnés.",
    calculationsAdded: true,
    blueprintsCount: 1,
    procuraReviewNotes: "Monto estimado inicial de $1,225 aprobado para licitación. Se solicita un anticipo no mayor al 40%.",
    approvedInvestmentAmount: 1225.0,
    proposals: [
      {
        id: "PROP-201",
        contractorCode: "CON-303",
        contractorName: "Mantenimiento Integral Express",
        materialCost: 1100.0,
        laborCost: 1500.0,
        totalCost: 2600.0,
        deliveryWeeks: 2,
        negotiatedAdvancePercent: 30,
        description: "Trabajo completo de andamiaje, lavado previo a presión, sellado de fisuras y dos manos de pintura premium. 30% de anticipo negociado."
      },
      {
        id: "PROP-202",
        contractorCode: "CON-301",
        contractorName: "Constructora Andes C.A.",
        materialCost: 1200.0,
        laborCost: 1800.0,
        totalCost: 3000.0,
        deliveryWeeks: 3,
        negotiatedAdvancePercent: 40,
        description: "Reparación estructural menor con malla de fibra y pintura de intemperie con garantía de 5 años. 40% de anticipo requerido."
      }
    ]
  },
  {
    id: "PRJ-003",
    title: "Ampliación de Galpón de Despacho Logístico",
    type: "INFRAESTRUCTURA",
    description: "Construcción de losa de concreto de 150m² y estructura metálica techada para zona de carga express de mercancía.",
    location: "Centro de Distribución Central",
    createdDate: "2026-05-10",
    status: ProjectStatus.COMPLETADO_PAGADO,
    materials: [
      { id: "m7", name: "Cemento Portland (Saco 42.5kg)", quantity: 120, unit: "Saco", estimatedUnitPrice: 12.5 },
      { id: "m8", name: "Acero de Refuerzo 1/2 pulgada", quantity: 80, unit: "Cabilla", estimatedUnitPrice: 18.0 },
      { id: "m9", name: "Arena Lavada para Concreto", quantity: 15, unit: "m³", estimatedUnitPrice: 35.0 },
      { id: "m10", name: "Bloque de Arcilla de 15cm", quantity: 2, unit: "Millar", estimatedUnitPrice: 450.0 }
    ],
    estimatedTotal: 4365.0,
    cierreObraNotes: "Planos estructurales aprobados por ingeniería municipal. Cálculos de resistencia de suelo verificados.",
    calculationsAdded: true,
    blueprintsCount: 4,
    procuraReviewNotes: "Proyecto estratégico para despacho de ventas e-commerce. Aprobado para licitación de emergencia.",
    approvedInvestmentAmount: 4365.0,
    proposals: [
      {
        id: "PROP-301",
        contractorCode: "CON-301",
        contractorName: "Constructora Andes C.A.",
        materialCost: 4100.0,
        laborCost: 3500.0,
        totalCost: 7600.0,
        deliveryWeeks: 4,
        negotiatedAdvancePercent: 30,
        description: "Construcción de losa con fibra de alta resistencia y herrería de columnas de soporte para techado de zinc."
      }
    ],
    selectedContractorCode: "CON-301",
    selectedProposalId: "PROP-301",
    advancePaidAmount: 2280.0, // 30% of total
    advancePaidDate: "2026-05-18",
    qualityVerified: true,
    completionVerifiedDate: "2026-06-12",
    finalPaidAmount: 5320.0, // Remaining 70% of 7600
    finalPaidDate: "2026-06-14"
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "LOG-101",
    projectId: "PRJ-003",
    projectTitle: "Ampliación de Galpón de Despacho Logístico",
    role: "INFRAESTRUCTURA",
    action: "Creación de petición de obra",
    timestamp: "2026-05-10 09:30",
    details: "Se generaron requerimientos de concreto y herrería para la zona de despacho."
  },
  {
    id: "LOG-102",
    projectId: "PRJ-003",
    projectTitle: "Ampliación de Galpón de Despacho Logístico",
    role: "CIERRE_DE_OBRA",
    action: "Revisión técnica de cálculos y planos",
    timestamp: "2026-05-12 11:15",
    details: "Cálculos estructurales corregidos y aprobados. 4 planos cargados al servidor."
  },
  {
    id: "LOG-103",
    projectId: "PRJ-003",
    projectTitle: "Ampliación de Galpón de Despacho Logístico",
    role: "PROCURA",
    action: "Confirmación de presupuesto y envío a licitación",
    timestamp: "2026-05-14 14:00",
    details: "Monto aprobado de $4,365. Petición transferida a los analistas de licitación."
  },
  {
    id: "LOG-104",
    projectId: "PRJ-003",
    projectTitle: "Ampliación de Galpón de Despacho Logístico",
    role: "ANALISTA",
    action: "Carga de cuadro comparativo",
    timestamp: "2026-05-16 10:45",
    details: "Propuesta de Constructora Andes C.A. cargada con un anticipo pactado del 30%."
  },
  {
    id: "LOG-105",
    projectId: "PRJ-003",
    projectTitle: "Ampliación de Galpón de Despacho Logístico",
    role: "PROCURA",
    action: "Confirmación de contratación",
    timestamp: "2026-05-17 16:30",
    details: "Contratista Constructora Andes C.A. asignada bajo código CON-301."
  },
  {
    id: "LOG-106",
    projectId: "PRJ-003",
    projectTitle: "Ampliación de Galpón de Despacho Logístico",
    role: "FINANZAS",
    action: "Liberación de anticipo del 30%",
    timestamp: "2026-05-18 09:00",
    details: "Liberado anticipo de $2,280 para inicio de obras civiles."
  },
  {
    id: "LOG-107",
    projectId: "PRJ-003",
    projectTitle: "Ampliación de Galpón de Despacho Logístico",
    role: "CIERRE_DE_OBRA",
    action: "Verificación de finalización y calidad de obra",
    timestamp: "2026-06-12 15:20",
    details: "Trabajo culminado satisfactoriamente bajo estándares de resistencia de concreto."
  },
  {
    id: "LOG-108",
    projectId: "PRJ-003",
    projectTitle: "Ampliación de Galpón de Despacho Logístico",
    role: "FINANZAS",
    action: "Liberación total de fondos",
    timestamp: "2026-06-14 10:10",
    details: "Pago final de $5,320 liberado. Obra cerrada presupuestariamente."
  }
];
