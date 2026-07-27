# IVOO — Gestión de Infraestructura

Sistema interno de gestión de obras de infraestructura y mantenimiento: seguimiento del ciclo de vida completo de un proyecto (creación → revisión de cierre de obra → aprobación de inversión → licitación/comparativa de proveedores → contratación → ejecución → verificación → pago), con evaluación asistida por IA de propuestas de contratistas, gestión de usuarios/roles, catálogo de materiales y proveedores, y un portal público para que proveedores externos se registren y envíen cotizaciones.

## Stack

- **Frontend web:** React 19 + TypeScript + Vite + Tailwind CSS 4 + `motion` (fork de framer-motion) + React Router 7.
- **Backend:** Laravel 9 (PHP) + Sanctum — repositorio separado (`infraestructura-back`), no incluido en este repo.
- **Mobile:** React Native + Expo (`mobile/`), consume la misma API.
- **Testing:** Vitest + Testing Library (frontend), PHPUnit (backend).
- **IA:** Evaluación de propuestas de contratistas vía OpenAI / Google Gemini / Anthropic Claude, orquestada por el backend con failover automático.

## Estructura del monorepo

```
├── src/                    Aplicación web (vistas, hooks, componentes)
│   ├── views/               Una carpeta o archivo por pantalla (paneles por rol)
│   ├── hooks/                Lógica de datos y negocio (fetch, polling, workflows)
│   ├── components/            UI compartida (Table, Modal, Toast, etc.)
│   └── routes/                 Enrutamiento y control de acceso por rol
├── packages/shared/          Cliente HTTP y tipos compartidos entre web y mobile
├── mobile/                  App React Native (Expo) — consumo de la misma API
└── src/__tests__/            Suite de tests (Vitest)
```

El backend (Laravel) vive en un repositorio aparte: `infraestructura-back`.

## Requisitos

- Node.js 20+
- El backend (`infraestructura-back`) corriendo en paralelo — ver su propio README para setup (PHP 8+, MySQL/MariaDB, Composer).

## Instalación y desarrollo

```bash
npm install
cp .env.example .env   # ajustar VITE_API_URL si el backend no corre en localhost:8000
npm run dev            # http://localhost:3000
```

La app requiere que el backend esté corriendo y accesible en la URL configurada en `VITE_API_URL` — sin él, el login no funciona (en desarrollo, si el fetch de proyectos falla, se muestran datos demo locales; en producción no hay ese fallback, ver `useProjectsData.ts`).

### Mobile (Expo)

```bash
cd mobile
npm install
cp .env.example .env   # ajustar EXPO_PUBLIC_API_URL según el emulador/dispositivo
npm start
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `npm test` | Corre la suite de Vitest una vez |
| `npm run test:watch` | Vitest en modo watch |
| `npm run test:coverage` | Suite + reporte de cobertura |

## Testing

~32 suites de Vitest cubriendo hooks de dominio, componentes de UI, vistas principales y el flujo de autenticación. Umbrales de cobertura configurados en `vite.config.ts` (`coverage.thresholds`). Ver `TESTING_GUIDE.md` para el detalle de qué cubre cada suite.

## Roles del sistema

`SUPERADMIN`, `ADMIN`, `PRESIDENCIA`, `INFRAESTRUCTURA`, `CIERRE_DE_OBRA`, `PROCURA`, `ANALISTA`, `FINANZAS`, `CATALOGOS`. La matriz de acceso a rutas por rol la sirve el backend (`GET /api/auth/permissions`), no está hardcodeada en el frontend.

## Documentación relacionada

- `FLUJO_SISTEMA.md` — flujo de negocio completo, estado por estado.
- `TESTING_GUIDE.md` — guía de testing.
- `CHANGELOG.md` — historial de cambios.
- `PENDIENTES.md` — backlog de auditorías (seguridad, clean code, testing).
