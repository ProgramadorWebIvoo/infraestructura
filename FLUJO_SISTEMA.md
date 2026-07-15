# IVOO Gestión de Infraestructura — Documentación del Flujo Operativo

**Versión:** 1.0  
**Fecha:** 2026-07-01  
**Sistema:** Plataforma web React + API Laravel (Sanctum)

---

## Índice

1. [Visión General](#1-visión-general)
2. [Roles del Sistema](#2-roles-del-sistema)
3. [Estados del Proyecto](#3-estados-del-proyecto)
4. [Flujo Completo Paso a Paso](#4-flujo-completo-paso-a-paso)
   - [Fase 1 — Registro de Obra](#fase-1--registro-de-obra-infraestructuramantenimiento)
   - [Fase 2 — Revisión Técnica](#fase-2--revisión-técnica-cierre-de-obra)
   - [Fase 3 — Aprobación de Inversión](#fase-3--aprobación-de-inversión-procura)
   - [Fase 4 — Licitación y Cuadro Comparativo](#fase-4--licitación-y-cuadro-comparativo-analistas)
   - [Fase 5 — Adjudicación o Rechazo](#fase-5--adjudicación-o-rechazo-procura)
   - [Fase 6 — Pago de Anticipo](#fase-6--pago-de-anticipo-finanzas)
   - [Fase 7 — Ejecución en Campo](#fase-7--ejecución-en-campo)
   - [Fase 8 — Reporte de Finalización](#fase-8--reporte-de-finalización-cierre-de-obra)
   - [Fase 9 — Verificación de Calidad](#fase-9--verificación-de-calidad-cierre-de-obra)
   - [Fase 10 — Pago Final y Cierre](#fase-10--pago-final-y-cierre-finanzas)
5. [Flujo de Proveedores de Materiales (Paralelo)](#5-flujo-de-proveedores-de-materiales-paralelo)
6. [Diagrama de Estado](#6-diagrama-de-estado)
7. [Trazabilidad y Auditoría](#7-trazabilidad-y-auditoría)
8. [Control de Acceso por Rol](#8-control-de-acceso-por-rol)

---

## 1. Visión General

IVOO Gestión es un sistema multi-rol para gestionar el ciclo de vida completo de obras de infraestructura y mantenimiento. Cada obra pasa secuencialmente por distintos departamentos, con trazabilidad en tiempo real de cada acción registrada en una bitácora de auditoría.

```
INFRAESTRUCTURA → CIERRE DE OBRA → PROCURA → ANALISTAS → PROCURA → FINANZAS → CAMPO → CIERRE DE OBRA → FINANZAS
```

---

## 2. Roles del Sistema

| Rol | Descripción | Acceso |
|---|---|---|
| `SUPERADMIN` / `ADMIN` | Acceso total a todos los módulos | Todos |
| `PRESIDENCIA` | Vista ejecutiva: KPIs, dashboards y trazabilidad en tiempo real | Dashboard + Trazabilidad |
| `INFRAESTRUCTURA` | Registra nuevas órdenes de obra o mantenimiento | Módulo Infraestructura |
| `CIERRE_DE_OBRA` | Revisión técnica de cálculos, planos y verificación final de calidad | Módulo Cierre de Obra |
| `PROCURA` | Aprueba inversión, gestiona licitación y adjudica contratistas | Módulo Procura + Catálogos |
| `ANALISTA` | Carga propuestas de contratistas y envía cuadro comparativo | Módulo Analistas |
| `FINANZAS` | Libera pagos: anticipo al inicio y liquidación final | Módulo Finanzas |

> Los roles son asignados desde el panel de Administración de Usuarios (`/usuarios`), accesible solo para ADMIN y SUPERADMIN.

---

## 3. Estados del Proyecto

Cada proyecto transita por los siguientes estados en orden:

| # | Estado (código) | Etiqueta en UI | Responsable que lo genera |
|---|---|---|---|
| 1 | `CREADO` | Enviado a Cierre de Obra | Infraestructura |
| 2 | `REVISADO_CIERRE` | Revisado — Para Procura | Cierre de Obra |
| 3 | `CONFIRMADO_PROCURA` | Confirmado — En Licitación | Procura |
| 4 | `COMPARATIVA_ENVIADA` | Comparativa Lista | Analistas |
| 5 | `CONTRATADO` | Pendiente Anticipo Finanzas | Procura |
| 6 | `EN_EJECUCION` | Obra en Ejecución | Finanzas |
| 7 | `VERIFICANDO_FINALIZACION` | Cerrando Obra (Auditoría) | Cierre de Obra |
| 8 | `LISTO_PAGO_FINAL` | Pendiente Finiquito | Cierre de Obra |
| 9 | `COMPLETADO_PAGADO` | Completado y Liquidado | Finanzas |

**Estado alternativo (retroceso):** Procura puede rechazar el cuadro comparativo, devolviendo el proyecto de `COMPARATIVA_ENVIADA` → `CONFIRMADO_PROCURA` y borrando todas las propuestas para reiniciar la licitación.

---

## 4. Flujo Completo Paso a Paso

---

### Fase 1 — Registro de Obra (Infraestructura/Mantenimiento)

**Módulo:** `/infraestructura`  
**Estado resultante:** `CREADO`  
**Rol requerido:** `INFRAESTRUCTURA`

**Qué hace el usuario:**
1. Ingresa al módulo **Infraestructura y Mantenimiento**.
2. Completa el formulario de nueva obra:
   - **Título** de la obra (ej. "Climatización Sala de Servidores CD IVOO")
   - **Tipo**: `INFRAESTRUCTURA` o `MANTENIMIENTO`
   - **Descripción** técnica detallada
   - **Ubicación** de la obra
3. Agrega los **materiales requeridos**:
   - Puede seleccionar del catálogo oficial de materiales (precios estimados precargados)
   - O ingresar materiales personalizados (nombre, unidad, precio unitario estimado, cantidad)
4. El sistema calcula el **total estimado** automáticamente sumando `cantidad × precio_unitario`.
5. Presiona **"Registrar Obra"**.

**Lo que ocurre en el sistema:**
- Se crea un registro en la tabla `projects` con estado `CREADO` y un ID correlativo (`PRJ-001`, `PRJ-002`, etc.).
- Se crean registros en `project_materials` por cada ítem de la lista.
- Se genera un log de auditoría: `INFRAESTRUCTURA | Creación de petición de obra`.
- El proyecto aparece inmediatamente en la cola de Cierre de Obra.

**API:** `POST /api/projects`

---

### Fase 2 — Revisión Técnica (Cierre de Obra)

**Módulo:** `/cierre-obra`  
**Estado resultante:** `REVISADO_CIERRE`  
**Rol requerido:** `CIERRE_DE_OBRA`

**Qué hace el usuario:**
1. Ingresa al módulo **Cierre de Obra**.
2. Ve la lista de proyectos en estado `CREADO` que aguardan revisión.
3. Selecciona el proyecto a revisar.
4. Revisa el alcance de la obra y los materiales solicitados.
5. Completa la revisión técnica:
   - **Notas técnicas** (observaciones sobre cálculos, alcance, correcciones)
   - **Cantidad de planos** adjuntados
   - Confirma si los **cálculos estructurales/técnicos** fueron agregados
6. Presiona **"Aprobar Revisión Técnica"**.

**Lo que ocurre en el sistema:**
- El proyecto actualiza su estado a `REVISADO_CIERRE`.
- Se guardan las notas, cantidad de planos y flag de cálculos en el proyecto.
- Log de auditoría: `CIERRE_DE_OBRA | Revisión técnica de cálculos y planos`.
- El proyecto pasa a la cola de Procura.

**API:** `POST /api/projects/{id}/review`

---

### Fase 3 — Aprobación de Inversión (Procura)

**Módulo:** `/procura`  
**Estado resultante:** `CONFIRMADO_PROCURA`  
**Rol requerido:** `PROCURA`

**Qué hace el usuario:**
1. Ingresa al módulo **Procura**, sección "Proyectos para Aprobación de Inversión".
2. Ve los proyectos en estado `REVISADO_CIERRE`.
3. Selecciona un proyecto y revisa el estimado total enviado por Infraestructura.
4. Define el **monto máximo de inversión aprobado** (puede diferir del estimado inicial).
5. Escribe **notas de aprobación** (justificación presupuestaria, restricciones).
6. Presiona **"Aprobar Inversión y Enviar a Licitación"**.

**Lo que ocurre en el sistema:**
- El proyecto actualiza su estado a `CONFIRMADO_PROCURA`.
- Se guarda `approved_investment_amount` y las notas de Procura.
- Log de auditoría: `PROCURA | Confirmación de presupuesto y envío a licitación`.
- El proyecto pasa a la cola de Analistas para iniciar la licitación.

**API:** `POST /api/projects/{id}/approve-investment`

---

### Fase 4 — Licitación y Cuadro Comparativo (Analistas)

**Módulo:** `/analistas`  
**Estado durante la fase:** `CONFIRMADO_PROCURA`  
**Estado resultante:** `COMPARATIVA_ENVIADA`  
**Rol requerido:** `ANALISTA`

Esta fase tiene dos pasos: cargar propuestas y luego enviar el cuadro comparativo.

#### 4A — Cargar propuestas de contratistas

1. El Analista ingresa al módulo **Analistas**.
2. Ve la lista de proyectos en licitación (`CONFIRMADO_PROCURA`).
3. Selecciona el proyecto y para cada contratista participante:
   - Selecciona el **contratista** del catálogo de proveedores registrados
   - Ingresa **costo de materiales**, **costo de mano de obra** y **total**
   - Indica el **plazo de entrega** en semanas
   - Define el **porcentaje de anticipo negociado** (ej. 30%)
   - Agrega una **descripción** de la oferta
   - Presiona **"Agregar Propuesta"**
4. Repite para cada contratista que participó en la licitación.
5. Las propuestas se acumulan en el cuadro comparativo del proyecto.

> El Analista puede **eliminar** una propuesta cargada si hubo un error, siempre que no haya sido adjudicada.

**API agregar:** `POST /api/projects/{id}/proposals`  
**API eliminar:** `DELETE /api/projects/{id}/proposals/{proposalId}`

#### 4B — Enviar cuadro comparativo a Procura

1. Una vez cargadas todas las propuestas, el Analista presiona **"Enviar Cuadro Comparativo a Procura"**.
2. El sistema valida que exista al menos 1 propuesta cargada.

**Lo que ocurre en el sistema:**
- El proyecto cambia a estado `COMPARATIVA_ENVIADA`.
- Logs: `ANALISTA | Carga de cuadro comparativo`.
- El proyecto pasa a la cola de Procura para seleccionar al ganador.

**API:** `POST /api/projects/{id}/submit-comparative`

---

### Fase 5 — Adjudicación o Rechazo (Procura)

**Módulo:** `/procura`  
**Rol requerido:** `PROCURA`

Procura recibe el cuadro comparativo y toma una de dos decisiones:

#### Opción A — Adjudicar contratista

**Estado resultante:** `CONTRATADO`

1. Procura ve los proyectos en estado `COMPARATIVA_ENVIADA`.
2. Revisa la tabla comparativa de propuestas (costo materiales, mano de obra, total, plazo, anticipo).
3. Selecciona la propuesta ganadora presionando **"Adjudicar"** en la fila correspondiente.

**Lo que ocurre en el sistema:**
- El proyecto actualiza su estado a `CONTRATADO`.
- Se guarda `selected_contractor_code` y `selected_proposal_id`.
- Log de auditoría: `PROCURA | Confirmación de contratación`.
- El proyecto pasa a la cola de Finanzas para liberación del anticipo.

**API:** `POST /api/projects/{id}/select-contractor`

#### Opción B — Rechazar cuadro comparativo

**Estado resultante:** `CONFIRMADO_PROCURA` (retroceso)

1. Procura presiona **"Rechazar Comparativa"** en el proyecto.
2. Ingresa el **motivo de rechazo**.
3. Confirma el rechazo.

**Lo que ocurre en el sistema:**
- El proyecto vuelve al estado `CONFIRMADO_PROCURA`.
- **Todas las propuestas son eliminadas** para iniciar una nueva licitación.
- Log de auditoría: `PROCURA | Rechazo de cuadro comparativo` con el motivo.
- El proceso regresa a la Fase 4 para que Analistas carguen nuevas propuestas.

**API:** `POST /api/projects/{id}/reject-proposals`

---

### Fase 6 — Pago de Anticipo (Finanzas)

**Módulo:** `/finanzas`  
**Estado resultante:** `EN_EJECUCION`  
**Rol requerido:** `FINANZAS`

**Qué hace el usuario:**
1. Ingresa al módulo **Finanzas**, sección "Anticipos Pendientes".
2. Ve los proyectos en estado `CONTRATADO`.
3. Selecciona el proyecto y revisa:
   - Contratista adjudicado
   - Monto total del contrato
   - Porcentaje de anticipo negociado
   - Monto del anticipo calculado automáticamente
4. Confirma el monto y presiona **"Liberar Anticipo"**.

**Lo que ocurre en el sistema:**
- Se crea un registro en `project_payments` de tipo `ADVANCE`.
- El proyecto actualiza su estado a `EN_EJECUCION`.
- Se guardan `advance_paid_amount` y `advance_paid_date`.
- Log de auditoría: `FINANZAS | Liberación de anticipo`.
- El pago queda registrado en el libro mayor de transacciones del módulo Finanzas.
- El proyecto pasa a ejecución activa en campo.

**API:** `POST /api/projects/{id}/payments` (body: `paymentType: "ADVANCE"`)

---

### Fase 7 — Ejecución en Campo

**Estado:** `EN_EJECUCION`  
**Responsable:** Contratista adjudicado (externo al sistema)

Durante esta fase:
- La obra está en ejecución física por el contratista.
- El sistema no requiere acción interna; el proyecto permanece en estado `EN_EJECUCION`.
- Presidencia puede monitorear el estado desde el dashboard ejecutivo.
- Una vez el contratista finaliza los trabajos, Cierre de Obra es notificada para certificar.

---

### Fase 8 — Reporte de Finalización (Cierre de Obra)

**Módulo:** `/cierre-obra`  
**Estado resultante:** `VERIFICANDO_FINALIZACION`  
**Rol requerido:** `CIERRE_DE_OBRA`

**Qué hace el usuario:**
1. En el módulo **Cierre de Obra**, sección "Proyectos en Ejecución / Para Verificar".
2. Localiza el proyecto en estado `EN_EJECUCION`.
3. Presiona **"Reportar Obra Finalizada"** para indicar que el contratista terminó los trabajos.

**Lo que ocurre en el sistema:**
- El proyecto actualiza su estado a `VERIFICANDO_FINALIZACION`.
- Log de auditoría: `SISTEMA | Reporte de obra finalizada`.
- El proyecto queda en cola para la verificación de calidad.

**API:** `POST /api/projects/{id}/report-finished`

---

### Fase 9 — Verificación de Calidad (Cierre de Obra)

**Módulo:** `/cierre-obra`  
**Estado resultante:** `LISTO_PAGO_FINAL`  
**Rol requerido:** `CIERRE_DE_OBRA`

**Qué hace el usuario:**
1. El inspector de Cierre de Obra visita la obra en campo y verifica que cumple con:
   - Las especificaciones técnicas de los planos aprobados
   - Los estándares de calidad de IVOO
   - El alcance original de la solicitud
2. En el sistema, localiza el proyecto en estado `VERIFICANDO_FINALIZACION`.
3. Presiona **"Verificar Finalización y Certificar Calidad"**.

**Lo que ocurre en el sistema:**
- El proyecto actualiza su estado a `LISTO_PAGO_FINAL`.
- Se guardan `quality_verified = true` y `completion_verified_date`.
- Log de auditoría: `CIERRE_DE_OBRA | Verificación de finalización y calidad de obra`.
- El proyecto pasa a la cola de Finanzas para el pago final.

> Si la calidad no es satisfactoria, el sistema puede devolver el proyecto a `EN_EJECUCION` para que el contratista corrija los trabajos.

**API:** `POST /api/projects/{id}/verify-completion`

---

### Fase 10 — Pago Final y Cierre (Finanzas)

**Módulo:** `/finanzas`  
**Estado resultante:** `COMPLETADO_PAGADO`  
**Rol requerido:** `FINANZAS`

**Qué hace el usuario:**
1. En el módulo **Finanzas**, sección "Pagos Finales Pendientes".
2. Ve los proyectos en estado `LISTO_PAGO_FINAL` (calidad certificada).
3. Revisa la información de liquidación:
   - Monto del contrato
   - Anticipo ya pagado
   - Saldo pendiente = Total contrato − Anticipo
4. Ingresa el monto de la liquidación final y presiona **"Liberar Pago Final"**.

**Lo que ocurre en el sistema:**
- Se crea un registro en `project_payments` de tipo `FINAL`.
- El proyecto actualiza su estado a `COMPLETADO_PAGADO`. **Fin del flujo.**
- Se guardan `final_paid_amount` y `final_paid_date`.
- Log de auditoría: `FINANZAS | Liberación total de fondos`.
- El proyecto aparece en el libro mayor con ambas transacciones (anticipo + finiquito).
- Presidencia ve el proyecto sumado a los KPIs de fondos liquidados.

**API:** `POST /api/projects/{id}/payments` (body: `paymentType: "FINAL"`)

---

## 5. Flujo de Proveedores de Materiales (Paralelo)

Este flujo corre en paralelo al flujo principal y permite que contratistas o proveedores externos coticen materiales para proyectos específicos.

### Registro de Proveedor (Público)

**URL pública:** `/registro-proveedores`  
**Sin autenticación requerida**

1. El proveedor/contratista ingresa a la URL pública.
2. Completa: nombre de empresa, especialidad, email de contacto.
3. El sistema genera un código de proveedor único (`CON-XXX`) y lo registra en el catálogo.
4. El proveedor queda disponible en el catálogo de contratistas del sistema.

**API:** `POST /api/contractors` (pública, sin token)

### Invitación de Proveedor a Cotizar (Procura)

**Módulo:** `/procura` → Catálogo de Proveedores  
**Rol requerido:** `PROCURA`

1. Procura selecciona un contratista registrado.
2. Selecciona el proyecto para el cual se desea cotización.
3. Presiona **"Invitar a Cotizar"**.
4. El sistema genera un **enlace único con token** (ej. `/propuesta-materiales/abc123`).
5. Procura copia y comparte el enlace con el proveedor (por email u otro medio).

**API:** `POST /api/supplier-invitations`

### Envío de Propuesta de Materiales (Proveedor Externo)

**URL pública:** `/propuesta-materiales/:token`  
**Sin autenticación requerida**

1. El proveedor accede al enlace recibido.
2. Ve la información del proyecto (título).
3. Completa su propuesta de materiales:
   - Lista de materiales con precios unitarios y totales
   - Notas generales
   - Plazo estimado de entrega
4. Envía la propuesta.

El sistema registra la propuesta vinculada al proyecto y al proveedor. Queda disponible para revisión interna en el módulo **Catálogos → Propuestas de Proveedores**.

**API:** `POST /api/public/invitations/{token}/proposal` (pública)

---

## 6. Diagrama de Estado

```
                    ┌─────────────────────────────────────────────────────┐
                    │                   FLUJO PRINCIPAL                    │
                    └─────────────────────────────────────────────────────┘

[INFRAESTRUCTURA]        [CIERRE OBRA]          [PROCURA]
  Registra obra   ──►   Revisión técnica  ──►  Aprueba inversión
  status: CREADO        status: REVISADO_       status: CONFIRMADO_
                        CIERRE                  PROCURA
                                                     │
                                                     ▼
                                              [ANALISTAS]
                                           Carga propuestas
                                           (una o más ofertas)
                                                     │
                                                     ▼ Enviar comparativa
                                              status: COMPARATIVA_ENVIADA
                                                     │
                                              [PROCURA]  ◄──────────────────┐
                                           Revisa comparativa               │
                                                     │                      │
                              ┌──────────────────────┤                      │
                              ▼ Rechaza              ▼ Adjudica             │
                        (elimina propuestas)   status: CONTRATADO           │
                        vuelve a CONFIRMADO_         │                      │
                        PROCURA ──────────────────────┘ (relicitación)     │
                                                     │                      │
                                              [FINANZAS]                    │
                                            Paga anticipo                   │
                                            status: EN_EJECUCION            │
                                                     │                      │
                                              [CAMPO]                       │
                                           Obra en ejecución                │
                                                     │                      │
                                              [CIERRE OBRA]                 │
                                          Reporta finalización              │
                                          status: VERIFICANDO_              │
                                          FINALIZACION                      │
                                                     │                      │
                                              [CIERRE OBRA]    ─ No OK ─►  │
                                          Verifica calidad                  │
                                                     │ OK                   │
                                                     ▼               (vuelve a EN_EJECUCION)
                                          status: LISTO_PAGO_FINAL
                                                     │
                                              [FINANZAS]
                                            Pago final / finiquito
                                                     │
                                                     ▼
                                          status: COMPLETADO_PAGADO ✓
```

---

## 7. Trazabilidad y Auditoría

Cada acción sobre un proyecto genera automáticamente un registro en la tabla `audit_logs` que incluye:

| Campo | Descripción |
|---|---|
| `id` | ID único del log (`LOG-YYYYMMDDHHmmss`) |
| `project_id` | Referencia al proyecto |
| `project_title_snapshot` | Título de la obra al momento del log |
| `role` | Rol del departamento que ejecutó la acción |
| `user_id` | ID del usuario autenticado |
| `user_name_snapshot` | Nombre del usuario al momento del registro |
| `action` | Descripción de la acción realizada |
| `logged_at` | Timestamp exacto |
| `details` | Notas o detalles adicionales de la acción |

**Presidencia** puede ver en tiempo real toda la bitácora desde el dashboard ejecutivo en `/presidencia`, con las columnas: Timestamp, Rol, **Usuario**, Acción, Proyecto, Ref. ID y Detalles. El panel se actualiza automáticamente cada 60 segundos.

### Acciones registradas en el log

| Departamento | Acción registrada |
|---|---|
| INFRAESTRUCTURA | Creación de petición de obra |
| CIERRE_DE_OBRA | Revisión técnica de cálculos y planos |
| PROCURA | Confirmación de presupuesto y envío a licitación |
| ANALISTA | Carga de propuesta |
| ANALISTA | Carga de cuadro comparativo |
| ANALISTA | Eliminación de propuesta |
| PROCURA | Rechazo de cuadro comparativo |
| PROCURA | Confirmación de contratación |
| FINANZAS | Liberación de anticipo |
| SISTEMA | Reporte de obra finalizada |
| CIERRE_DE_OBRA | Verificación de finalización y calidad de obra |
| FINANZAS | Liberación total de fondos |

---

## 8. Control de Acceso por Rol

| Módulo / Ruta | SUPERADMIN | ADMIN | PRESIDENCIA | INFRAESTRUCTURA | CIERRE_OBRA | PROCURA | ANALISTA | FINANZAS |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/presidencia` (Dashboard) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/infraestructura` | ✓ | ✓ | — | ✓ | — | — | — | — |
| `/cierre-obra` | ✓ | ✓ | — | — | ✓ | — | — | — |
| `/procura` | ✓ | ✓ | — | — | — | ✓ | — | — |
| `/analistas` | ✓ | ✓ | — | — | — | — | ✓ | — |
| `/finanzas` | ✓ | ✓ | — | — | — | — | — | ✓ |
| `/catalogos` (Proveedores) | ✓ | ✓ | — | — | — | ✓ | — | — |
| `/usuarios` (Admin) | ✓ | ✓ | — | — | — | — | — | — |

> Las rutas públicas `/registro-proveedores` y `/propuesta-materiales/:token` son accesibles sin autenticación para proveedores externos.

---

*Documentación generada el 2026-07-01 — Sistema IVOO Gestión de Infraestructura*
