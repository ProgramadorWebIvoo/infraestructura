# Guía de Pruebas — IVOO Gestión de Infraestructura

> Última actualización: 28/07/2026. Cubre seguridad/integración (Parte 1) y
> flujos funcionales end-to-end (Parte 2). Requiere backend (`php artisan serve`,
> puerto 8000) y frontend (`npm run dev`, puerto 3000) corriendo en paralelo.

---

# Parte 1 — Seguridad e Integración

## 1. Content Security Policy (CSP)

### Prueba
1. Abrir la app en el navegador
2. F12 → Console
3. **Esperado:** Sin errores de CSP (ningún mensaje rojo con "Content Security Policy")
4. F12 → Network → click en cualquier request → Response Headers
5. **Esperado:** Header `Content-Security-Policy` presente

### Si falla
- La app se ve en blanco o con errores de CSP en Console
- Posible causa: falta `'unsafe-inline'` en `script-src` si Vite HMR no funciona
- **Pendiente conocido:** las cabeceras CSP hoy las emite el middleware Laravel
  (`app/Http/Middleware/AddCspHeaders.php`), lo cual protege las respuestas de
  la API pero **no** el HTML/JS estático del SPA servido en producción — ver
  PENDIENTES.md, ítem crítico "Cabeceras de seguridad nunca llegan a
  producción" (bloqueado hasta definir dónde se sirve `dist/`: Nginx, Vercel, etc.)

---

## 2. Sanitización XSS en formularios públicos

### Prueba 1 — /registro-proveedores
1. Ir a `http://localhost:3000/registro-proveedores`
2. En "Nombre de la empresa" ingresar: `<script>alert(1)</script>Empresa de prueba`
3. Enviar formulario
4. **Esperado:** El nombre se guarda como "Empresa de prueba" (etiquetas HTML eliminadas). Sin alert().

### Prueba 2 — /propuesta-materiales/:token
1. Abrir un link de invitación válido
2. En "Materiales adicionales" → "Nombre del material" ingresar: `<b>Material XSS</b>`
3. En "Notas" ingresar: `<img src=x onerror=alert(1)>`
4. Enviar propuesta
5. **Esperado:** Se guarda "Material XSS" y las notas sin etiquetas HTML. Sin alert().

---

## 3. Errores genéricos del backend

### Prueba
1. Ir a `http://localhost:3000/`
2. Ingresar email y password incorrectos
3. Hacer clic en "Ingresar"
4. **Esperado:** Mensaje "Correo o clave incorrectos." o similar. **No** debe mostrar un error técnico como "SQLSTATE[HY000]" o stack trace.

### Si falla
- `APP_DEBUG=true` en `.env` del backend. Cambiar a `false` en producción para evitar fuga de información.
- **Confirmado en testing (28/07/2026):** con `APP_DEBUG=true` local, una excepción no controlada (ej. transporte SMTP caído) devuelve `exception`, `file` y `trace` completos en el JSON — incluida la ruta absoluta del servidor. Es el comportamiento esperado solo en dev; verificar `APP_DEBUG=false` antes de cualquier deploy.

---

## 4. Rate limiting backend (10 req/min)

### Prueba
```powershell
# PowerShell (ejecutar en terminal)
for ($i=1; $i -le 12; $i++) {
    $body = @{name="Test $i"; specialty="Testing"; contact="test$i@test.com"} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "http://localhost:8000/api/contractors" `
      -Method POST `
      -Headers @{"Accept"="application/json"; "Content-Type"="application/json"} `
      -Body $body
    Write-Output "Request $i: $($r.StatusCode)"
}
```

```bash
# Alternativa con curl (Git Bash / WSL)
for i in $(seq 1 12); do
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      "http://localhost:8000/api/contractors" \
      -H "Accept: application/json" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"Test $i\",\"specialty\":\"Testing\",\"contact\":\"test$i@test.com\"}")
    echo "Request $i: $status"
done
```

**Esperado:**
- Requests 1-10: `201 Created` o `422 Unprocessable`
- Request 11+: `429 Too Many Requests`

---

## 5. Logging de accesos públicos

### Prueba
1. Ejecutar cualquier request a ruta pública (POST /contractors, GET /public/invitations/:token, POST /public/invitations/:token/proposal)
2. Revisar logs de Laravel:
```bash
tail -f storage/logs/laravel.log | grep PUBLIC_ACCESS
```
**Esperado:** Una entrada `PUBLIC_ACCESS` con IP, User-Agent, action, timestamp.

---

## 6. CORS restringido

### Prueba
1. Abrir una página HTML estática desde otro origen (ej. `http://127.0.0.1:5500/test.html`)
2. Ejecutar:
```js
fetch('https://infraestructuraback.ivoofix.com/api/contractors', {
  headers: { Accept: 'application/json' }
}).then(r => console.log(r.status)).catch(e => console.error(e))
```
3. **Esperado:** Error CORS en console (el origen no está en `allowed_origins`)

### Nota
`config/cors.php` solo permite el origen `FRONTEND_URL` (un único valor, no una
lista). Cualquier otro origen — incluido `http://localhost:19006`/`19008`
(Expo Web) — es rechazado por diseño. Ver §16 (Mobile) para el detalle de por
qué esto importa al probar la app mobile desde un navegador.

---

## 7. X-Refresh-Token (renovación silenciosa)

### Prueba
1. Hacer login en la app (usuario con credenciales válidas)
2. Abrir F12 → Application → Local Storage → `ivoo_auth_token`
3. Anotar el token actual
4. **Envejecer el token** (simular que pasaron ~23h):
   ```bash
   # Desde la terminal del backend
   php artisan token:age admin@example.com
   # (reemplaza admin@example.com por el email con el que hiciste login)
   ```
5. Navegar por la app (hacer cualquier request autenticado)
6. Abrir F12 → Network → buscar un request a la API
7. **Esperado:** El response incluye el header `X-Refresh-Token`, y el token en localStorage se actualiza automáticamente

### Nota
Esto aplica al flujo **mobile** (auth por Bearer token, `SANCTUM_EXPIRATION`).
El flujo **web** usa cookie httpOnly de sesión (Sanctum SPA) — no hay token
legible en `localStorage` para renovar; `localStorage["ivoo_auth_token"]` no
existe en el flujo web actual (confirmado: `document.cookie` solo expone
`XSRF-TOKEN`, la cookie de sesión real es httpOnly e invisible a JS).

### Si no aparece X-Refresh-Token
- Verifica que el comando `token:age` se ejecutó correctamente (muestra "Token #X envejecido")
- Verifica que `SANCTUM_EXPIRATION` en `.env` no sea null (debe ser 1440 o similar)
- Verifica que el middleware `refresh.token` esté presente en el grupo de rutas autenticadas (`routes/api.php`)

---

## 8. Session timeout por inactividad web (30 min)

### Prueba
1. Hacer login en la app
2. No tocar el teclado, mouse ni touch por 30 minutos
3. **Esperado:** La app llama `POST /logout` (invalida la cookie de sesión en el
   backend) y luego recarga la página, mostrando el login.

### Prueba rápida (código)
Para probar sin esperar 30 min, modificar temporalmente en `src/hooks/useAuth.ts`:
```ts
const SESSION_TIMEOUT_MS = 30 * 1000; // 30 segundos en vez de 30 min
```
Y repetir la prueba.

### Detalle importante
El timeout usa `Date.now()` + `setInterval` cada 15s (no `setTimeout` puro),
para que funcione aunque el PC se suspenda — un `setTimeout` se congela al
dormir la máquina, `Date.now()` no. Además llama `POST /logout` **antes** de
recargar: si solo limpiara estado local y recargara, la cookie httpOnly de
sesión (con su propio `SESSION_LIFETIME` en el backend) seguiría vigente y
`GET /user` volvería a autenticar sola — el timeout no tendría efecto real.
Cubierto por 5 tests unitarios en `src/__tests__/hooks/useAuth.test.ts`
(timeout normal, fallo de red en `/logout`, no-disparo antes de tiempo,
`visibilitychange` tras suspensión, no doble logout).

---

## 9. Links de invitación — Single-use + invalidación

### Prueba 1 — Single-use
1. Obtener un link de invitación válido (UUID)
2. Abrirlo en el navegador → debe cargar el formulario de propuesta
3. Enviar una propuesta → debe mostrar "Propuesta enviada exitosamente"
4. Recargar la página con el mismo link
5. **Esperado:** Mensaje "Enlace no valido o expirado."

### Prueba 2 — Invalidación al re-invitar
1. Desde el panel de Procura/Analistas, generar una invitación para proveedor X en proyecto Y
2. Anotar el UUID del link
3. Generar una SEGUNDA invitación para el mismo proveedor X en el mismo proyecto Y
4. Abrir el PRIMER link (el UUID anotado)
5. **Esperado:** Mensaje "Enlace no valido o expirado."
6. Abrir el SEGUNDO link
7. **Esperado:** Debe cargar el formulario normalmente

---

## 10. Configuración de correo en desarrollo local

### Qué
El `.env` del backend usa `MAIL_MAILER=smtp` apuntando a `smtp.gmail.com:587`,
con `MAIL_USERNAME`, `MAIL_PASSWORD` y `MAIL_FROM_ADDRESS` a completar
localmente (nunca commitear valores reales).

### Por qué
El valor original del repo (`MAIL_HOST=mailpit`) apunta a un contenedor Docker
que no corre por defecto en este entorno — cualquier acción que dispare un
correo (ej. "Enviar link de restablecimiento" en Configuración → Usuarios)
fallaba con `500` (`Connection could not be established with host "mailpit"`,
ver `storage/logs/laravel.log`). Se cambió a SMTP real (Gmail) para poder
verificar la entrega end-to-end a una bandeja real, no solo el log.

### Cómo
1. Activar verificación en 2 pasos en la cuenta de Gmail a usar.
2. Generar una contraseña de aplicación en https://myaccount.google.com/apppasswords
   (16 caracteres, sin espacios al pegarla). **No** es la contraseña normal de la cuenta.
3. En `infraestructura-back/.env`, completar:
   ```
   MAIL_USERNAME=tu-correo@gmail.com
   MAIL_PASSWORD=la-contraseña-de-aplicación-de-16-caracteres
   MAIL_FROM_ADDRESS=tu-correo@gmail.com
   ```
4. `php artisan config:clear` (Laravel cachea `.env` en memoria/config cache).
5. Probar: Configuración → Usuarios → ícono de enviar en cualquier usuario cuyo
   email sea real (ojo: usuarios con `@ivoo.local` u otro dominio ficticio
   generan un `200` pero el correo nunca llega a ningún lado — el dominio no
   existe).
   **Esperado:** `POST /api/users/{id}/send-reset-link` devuelve `200` y el correo
   llega a la bandeja de destino en segundos, con un link
   `http://localhost:3000/reset-password/{token}?email=...` que lleva al formulario
   de nueva contraseña (§13).

### Alternativa sin credenciales externas
Si no se quiere usar una cuenta real: `MAIL_MAILER=log` escribe el correo (incluido
el link de reset) en `storage/logs/laravel.log` en vez de enviarlo — sirve para
verificar que el flujo funciona sin depender de un proveedor SMTP.

---

# Parte 2 — Flujos funcionales end-to-end

## 11. Rutas y llamadas API (smoke test tras cualquier cambio de conexión)

### Prueba
1. Login como un usuario `SUPERADMIN`/`ADMIN`.
2. Recorrer cada vista del sidebar: Presidencia, Infra/Mant, Cierre Obra,
   Procura, Analistas, Finanzas, Proveedores, Configuración (Usuarios,
   Proveedores).
3. En cada una, F12 → Network, filtrar por `/api/` y confirmar `200` en:
   `/api/user`, `/api/auth/permissions`, `/api/contractors`, `/api/materials`,
   `/api/projects`, `/api/audit-logs`, `/api/users`.
4. F12 → Console: sin errores.

**Esperado:** todas las vistas cargan datos reales sin 4xx/5xx ni errores de consola.

---

## 12. Seguridad entre roles y CRUD en Configuración

### Preparación — crear un usuario de prueba por rol
1. Configuración → Usuarios → crear uno por cada rol operativo: Presidencia,
   Infraestructura/Mant., Cierre de Obra, Procura, Analistas, Finanzas, Catálogos.
2. **Ojo con el select de Rol:** al hacer click y luego click en la opción, a
   veces el navegador cierra el `<select>` nativo antes de que el segundo click
   registre la opción, dejando el rol por defecto (Infraestructura/Mant.) —
   pasó durante testing. Verificar el valor mostrado en el select **antes** de
   enviar el formulario, o usar teclado (`↓`/`↑` + `Enter`) en vez de click en
   la opción.

### Prueba 1 — Restricción de sidebar
1. Login con el usuario de prueba de un rol (ej. Infraestructura).
2. **Esperado:** el sidebar muestra únicamente el módulo de ese rol.

### Prueba 2 — Bypass por URL directa (frontend)
1. Logueado como el mismo usuario, navegar manualmente a una ruta ajena
   (ej. `http://localhost:3000/usuarios`).
2. **Esperado:** redirige automáticamente a la vista permitida del rol, sin
   mostrar contenido de la ruta ajena.

### Prueba 3 — Enforcement real en backend (no solo UI)
1. Con el mismo usuario logueado, en la consola del navegador:
   ```js
   fetch('/api/users', { headers: { Accept: 'application/json' } })
     .then(r => console.log(r.status))
   ```
2. **Esperado:** `403`, no `200` — la restricción no depende solo de ocultar
   la UI, el backend la rechaza igual si se llama directo a la API.

---

## 13. Restablecimiento de contraseña — flujo completo

> Requiere mail configurado (§10) para el paso 1; si se usa `MAIL_MAILER=log`,
> tomar el link desde `storage/logs/laravel.log` en vez del correo.

1. Configuración → Usuarios → ícono de avión de papel en la fila del usuario objetivo.
2. **Esperado:** `POST /api/users/{id}/send-reset-link` → `200`, toast de éxito.
3. Abrir el link recibido: `http://localhost:3000/reset-password/{token}?email=...`
4. **Esperado:** carga el formulario "Restablecer contraseña" (`src/views/ResetPasswordScreen`),
   con el email pre-cargado (solo lectura) desde el query param.
5. Completar nueva clave (mín. 8, mayúscula+minúscula+número) + confirmación → enviar.
6. **Esperado:** `POST /api/reset-password` → `200`, mensaje "Contraseña actualizada
   correctamente." con link a login.
7. Cerrar sesión (si había alguna activa) y loguear con el usuario objetivo y la
   clave nueva.
8. **Esperado:** login exitoso.

### Notas
- No existe flujo de auto-servicio "olvidé mi contraseña" en el login — el
  reset es siempre **admin-driven** desde Configuración → Usuarios, por diseño.
- El token es de un solo uso y expira (`Password::reset()` de Laravel, tabla
  `password_reset_tokens`) — reintentar el mismo link tras usarlo debe fallar
  con un mensaje de error (email de "token inválido").

---

## 14. Polling

### Prueba
1. Login y quedarse en cualquier vista con datos vivos (ej. Presidencia).
2. F12 → Network, limpiar el log, no interactuar con la página por ~30s.
3. **Esperado:** se ven llamadas repetidas a los mismos endpoints (ej.
   `/api/contractors`, `/api/materials`) a intervalos regulares (~15s),
   siempre `200`, sin que se disparen en ráfaga ni se dupliquen por render.

---

## 15. ModalSelect (selector paginado con búsqueda)

### Prueba
1. Ir a Infra/Mant → "Configurar Requerimientos de Material/Servicios" → tab
   "Catálogo IVOO" → click en el campo "Seleccionar Material" (ícono de lupa).
2. **Esperado:** modal con contador "N de N opciones", tabla con columnas
   correctas (Nombre / Unidad / Precio Unit.) — no debe mostrar una columna
   "Valor" con el índice interno del array (bug ya corregido).
3. Escribir un término de búsqueda parcial (ej. "cemento").
4. **Esperado:** filtra en vivo, actualiza el contador ("1 de N — filtrado") y
   la paginación ("Mostrando 1 — 1 de 1 registros").
5. Click en una fila → "Seleccionar".
6. **Esperado:** el modal cierra y el valor elegido queda cargado en el campo
   del formulario.

El mismo componente se reusa en el modal de invitar proveedor a una obra
(`ProveedoresRegistrados`) — verificar ahí también que solo puede haber un
modal abierto a la vez (bug de doble modal ya corregido, `activeModal` como
estado discriminado único).

---

## 16. App mobile (Expo)

### Estado conocido
`mobile/api.ts` importa `../packages/shared/src/api` (fuera de la carpeta
`mobile/`, que es el project root de Metro). Sin `mobile/metro.config.js`
con `watchFolders` apuntando a la raíz del monorepo, Metro no puede resolver
ese import y la app **no bundlea en absoluto** (ni Expo Web, ni emulador, ni
build) — falla con `Unable to resolve "../packages/shared/src/api" from "api.ts"`.
Ya se agregó `mobile/metro.config.js` corrigiendo esto.

### Cómo levantarla
```bash
cd mobile
npm run web       # o: npx expo start --web --port <puerto>
# Android emulator: npm run android (requiere Android Studio / emulador corriendo)
```

`EXPO_PUBLIC_API_URL` en `mobile/.env` depende del target (ver comentarios en
`mobile/.env.example`):
- Android emulator: `http://10.0.2.2:8000/api`
- iOS simulator / Expo Web: `http://127.0.0.1:8000/api`
- Dispositivo físico (misma red): IP LAN del servidor
- Producción: URL real del backend

### ⚠️ Limitación al probar vía Expo Web
`config/cors.php` del backend solo permite un único origen (`FRONTEND_URL`,
`http://localhost:3000`). El puerto de Expo Web (`19006`/`19008`/...) **no**
está en esa lista, así que un login desde el navegador contra Expo Web puede
devolver `503`/error de red aunque el bundling funcione bien — esto es una
limitación de **este método de prueba** (navegador = origen cross-site), no
necesariamente un bug de la app. El target real de mobile es Android/iOS
nativo (o el emulador), donde no hay concepto de "origen" de navegador y por
lo tanto no aplica CORS. Si se necesita probar realmente vía Expo Web,
agregar temporalmente el puerto usado a `FRONTEND_URL`/`allowed_origins` (sin
commitear ese cambio) o migrar `cors.php` a soportar múltiples orígenes.

---

## 17. Pruebas unitarias automatizadas

```bash
# Frontend (React SPA) — 439 tests / 34 archivos a la fecha de esta guía
cd infraestructura
npm test

# Backend (Laravel)
cd infraestructura-back
php artisan test

# Mobile (Jest + React Native Testing Library)
cd mobile
npm test
```

**Esperado:** Todos los tests pasan (green).

---

## Resumen rápido (checklist pre-deploy)

- [ ] App carga sin errores de CSP
- [ ] Formularios públicos sanitizan XSS
- [ ] Errores del backend son genéricos (`APP_DEBUG=false`)
- [ ] Rate limit backend funcional (429 tras 10 req/min)
- [ ] CORS bloquea orígenes no autorizados
- [ ] Token mobile se renueva silenciosamente (X-Refresh-Token)
- [ ] Sesión web expira por inactividad (30 min) y llama `POST /logout`
- [ ] Links de invitación: single-use y se invalidan al re-invitar
- [ ] Todas las vistas cargan sin 4xx/5xx tras cambios de conexión API
- [ ] Roles restringen sidebar Y backend (403 real, no solo UI)
- [ ] Reset de contraseña: envío → link → formulario → login funcionan de punta a punta
- [ ] Polling activo sin duplicar requests
- [ ] ModalSelect: búsqueda, paginación y selección
- [ ] `npm test` (frontend) → 439/439 pasando
- [ ] `php artisan test` (backend) → verde
