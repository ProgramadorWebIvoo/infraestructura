# Guía de Pruebas — Seguridad e Integración

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

### Si no aparece X-Refresh-Token
- Verifica que el comando `token:age` se ejecutó correctamente (muestra "Token #X envejecido")
- Verifica que `SANCTUM_EXPIRATION` en `.env` no sea null (debe ser 1440 o similar)
- Verifica que el middleware `refresh.token` esté presente en el grupo de rutas autenticadas (`routes/api.php`)

---

## 8. Session timeout por inactividad (30 min)

### Prueba
1. Hacer login en la app
2. No tocar el teclado, mouse ni touch por 30 minutos
3. **Esperado:** La app cierra sesión automáticamente y recarga la página

### Prueba rápida (código)
Para probar sin esperar 30 min, puedes modificar temporalmente en `src/hooks/useAuth.ts`:
```ts
const SESSION_TIMEOUT_MS = 30 * 1000; // 30 segundos en vez de 30 min
```
Y repetir la prueba.

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

## 10. Pruebas unitarias automatizadas

```bash
# Frontend (React SPA)
cd infraestructura
npm test

# Backend (Laravel)
cd infraestructura-back
php artisan test
```

**Esperado:** Todos los tests pasan (green).

---

## Resumen rápido (checklist pre-deploy)

- [ ] App carga sin errores de CSP
- [ ] Formularios públicos sanitizan XSS
- [ ] Errores del backend son genéricos
- [ ] Rate limit backend funcional (429 tras 10 req/min)
- [ ] CORS bloquea orígenes no autorizados
- [ ] Token se renueva silenciosamente (X-Refresh-Token)
- [ ] Sesión expira por inactividad (30 min)
- [ ] Links de invitación: single-use y se invalidan al re-invitar
- [ ] npm test → 37/37 pasando
