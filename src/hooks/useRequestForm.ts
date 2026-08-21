/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado y lógica de negocio del formulario de alta de petición — extraído
 * de InfraestructuraMantenimientoPanel/index.tsx para separar la orquestación
 * visual (JSX) de la validación/armado de payload/submit (SRP).
 */

import { useMemo, useState } from "react";
import type { MaterialItem, Project } from "../types";

/** Alias legible en los call sites de useRequestForm — ver UseRequestFormParams::existingProject. */
type RequestFormExistingProject = Pick<
  Project,
  "id" | "title" | "type" | "description" | "location" | "materials" | "documents"
>;

export type FieldKey = "title" | "location" | "description" | "materials" | "attachments";
export type FieldErrors = Partial<Record<FieldKey, string>>;

interface FormFields {
  title: string;
  location: string;
  description: string;
  addedMaterials: Omit<MaterialItem, "id">[];
  photoFiles: File[];
  documentFiles: File[];
  planFiles: File[];
  hasExistingAttachments?: boolean;
}

type DatosStepFields = Pick<FormFields, "title" | "location" | "description">;
type MaterialesStepFields = Pick<FormFields, "addedMaterials">;
type AdjuntosStepFields = Pick<FormFields, "photoFiles" | "documentFiles" | "planFiles"> & {
  /** Modo edición: ya hay adjuntos persistidos en el proyecto (subidos en el envío original) — no se exige un archivo nuevo. */
  hasExistingAttachments?: boolean;
};

/** Paso 1 del wizard: datos de la obra. Pura, testeable sin renderizar el hook. */
export function validateDatosStep({ title, location, description }: DatosStepFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!title.trim()) errors.title = "El título de la obra o trabajo es obligatorio.";
  if (!location.trim()) errors.location = "La ubicación exacta es obligatoria.";
  if (!description.trim()) errors.description = "Describe el alcance del trabajo a realizar.";
  return errors;
}

/** Paso 2 del wizard: materiales. */
export function validateMaterialesStep({ addedMaterials }: MaterialesStepFields): FieldErrors {
  const errors: FieldErrors = {};
  if (addedMaterials.length === 0) errors.materials = "Agrega al menos un material o servicio a la petición.";
  return errors;
}

/** Paso 3 del wizard: adjuntos. Al menos un archivo entre los 3 grupos (fotos/documentos/planos),
 * salvo en modo edición cuando el proyecto ya tiene adjuntos persistidos del envío original. */
export function validateAdjuntosStep({ photoFiles, documentFiles, planFiles, hasExistingAttachments }: AdjuntosStepFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!hasExistingAttachments && photoFiles.length === 0 && documentFiles.length === 0 && planFiles.length === 0) {
    errors.attachments = "Adjunta al menos un archivo (foto, documento o plano) antes de continuar.";
  }
  return errors;
}

/** Unión exacta de los 3 validadores por paso — misma firma/mensajes que antes de dividirla. */
export function validateRequestForm(fields: FormFields): FieldErrors {
  return { ...validateDatosStep(fields), ...validateMaterialesStep(fields), ...validateAdjuntosStep(fields) };
}

interface UseRequestFormParams {
  onAddProject: (
    project: Omit<Project, "id" | "createdDate" | "status">,
    files: { photos: File[]; documents: File[]; plans: File[] },
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
  /** Modo edición: petición rechazada que se está corrigiendo y reenviando (mismo id, no crea un proyecto nuevo). */
  existingProject?: RequestFormExistingProject;
  /** Requerido cuando existingProject está presente — handleSubmit lo usa en vez de onAddProject. */
  onResubmitProject?: (
    projectId: string,
    project: Omit<Project, "id" | "createdDate" | "status" | "type">,
    files: { photos: File[]; documents: File[]; plans: File[] },
  ) => Promise<{ ok: boolean; partial: boolean; failedGroups: string[] }>;
}

export function useRequestForm({ onAddProject, existingProject, onResubmitProject }: UseRequestFormParams) {
  const [title, setTitle] = useState(existingProject?.title ?? "");
  const [type, setType] = useState<"INFRAESTRUCTURA" | "MANTENIMIENTO">(existingProject?.type ?? "INFRAESTRUCTURA");
  const [description, setDescription] = useState(existingProject?.description ?? "");
  const [location, setLocation] = useState(existingProject?.location ?? "");

  const [addedMaterials, setAddedMaterials] = useState<Omit<MaterialItem, "id">[]>(
    existingProject?.materials?.map(({ id: _id, ...rest }) => rest) ?? [],
  );
  // Índices de materiales cuyas características ya se revisaron/confirmaron
  // en el modal de edición — usado solo para el indicador visual "sin
  // revisar" (no afecta el payload enviado: condition siempre tiene un
  // default válido). Se resetea al agregar o quitar materiales porque los
  // índices dejan de ser estables.
  const [reviewedMaterialIndexes, setReviewedMaterialIndexes] = useState<Set<number>>(new Set());

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const materialsSubtotal = useMemo(
    () => addedMaterials.reduce((sum, m) => sum + m.quantity * m.estimatedUnitPrice, 0),
    [addedMaterials],
  );

  const clearError = (key: FieldKey) =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const handleAddedMaterialsChange = (materials: Omit<MaterialItem, "id">[]) => {
    // Si se achicó la lista (remoción), no hay forma confiable de saber qué
    // índice se fue sin comparar identidad de objeto — se descarta todo el
    // tracking de revisión y el usuario vuelve a ver el indicador "sin
    // revisar" en lo que quede. Prioriza seguridad (no ocultar el aviso)
    // sobre precisión perfecta en este caso límite poco frecuente.
    if (materials.length < addedMaterials.length) {
      setReviewedMaterialIndexes(new Set());
    }
    setAddedMaterials(materials);
    clearError("materials");
  };

  const markMaterialReviewed = (index: number) => {
    setReviewedMaterialIndexes((prev) => new Set(prev).add(index));
  };

  const handlePhotoFilesChange = (files: File[]) => { setPhotoFiles(files); clearError("attachments"); };
  const handleDocumentFilesChange = (files: File[]) => { setDocumentFiles(files); clearError("attachments"); };
  const handlePlanFilesChange = (files: File[]) => { setPlanFiles(files); clearError("attachments"); };

  const hasExistingAttachments = !!existingProject?.documents?.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const errors = validateRequestForm({
      title, location, description, addedMaterials, photoFiles, documentFiles, planFiles, hasExistingAttachments,
    });
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const materials = addedMaterials.map((m, index) => ({ id: `m-new-${index}-${Date.now()}`, ...m }));
      const files = { photos: photoFiles, documents: documentFiles, plans: planFiles };

      const result = existingProject
        ? await onResubmitProject!(existingProject.id, { title, description, location, materials, estimatedTotal: materialsSubtotal }, files)
        : await onAddProject({ title, type, description, location, materials, estimatedTotal: materialsSubtotal }, files);

      if (result.ok) {
        setTitle(""); setDescription(""); setLocation("");
        setAddedMaterials([]);
        setReviewedMaterialIndexes(new Set());
        setPhotoFiles([]); setDocumentFiles([]); setPlanFiles([]);
        // el toast de éxito/advertencia ya lo emite onAddProject/onResubmitProject (solo ahí se conoce el resultado real de los uploads)
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    title, setTitle: (v: string) => { setTitle(v); clearError("title"); },
    type, setType,
    description, setDescription: (v: string) => { setDescription(v); clearError("description"); },
    location, setLocation: (v: string) => { setLocation(v); clearError("location"); },
    addedMaterials, setAddedMaterials: handleAddedMaterialsChange,
    reviewedMaterialIndexes, markMaterialReviewed,
    materialsSubtotal,
    photoFiles, setPhotoFiles: handlePhotoFilesChange,
    documentFiles, setDocumentFiles: handleDocumentFilesChange,
    planFiles, setPlanFiles: handlePlanFilesChange,
    hasExistingAttachments,
    fieldErrors,
    isSubmitting,
    handleSubmit,
    isEditMode: !!existingProject,
  };
}

export type UseRequestFormReturn = ReturnType<typeof useRequestForm>;
