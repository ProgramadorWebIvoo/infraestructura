# Pendientes

## Limpieza de `src/data.ts`

**Contexto:** `data.ts` contiene arreglos de datos estáticos (`INITIAL_PROJECTS`, `INITIAL_CONTRACTORS`, `INITIAL_AUDIT_LOGS`, `MATERIAL_CATALOG`) que eran el seed original del frontend antes de integrar la API.

Hoy la app opera completamente contra la API Laravel + MySQL. Estos datos solo se referencian en:

- `src/App.tsx` líneas 518–520: función de reinicio que ya no tiene sentido (el propio `alert()` dice que el reinicio se hace importando `database.sql`).
- `src/App.tsx` línea 14: import de `MATERIAL_CATALOG` (verificar si aún se usa en algún componente).

### Tareas

1. **Verificar** si `MATERIAL_CATALOG` se usa en algún componente activo.
2. **Eliminar** `src/data.ts`.
3. **Eliminar** el bloque de reset en `App.tsx` (líneas ~516–521) y el import correspondiente.
4. Si `MATERIAL_CATALOG` tiene utilidad, migrar su contenido a la BD (tabla `material_catalog` o similar) o descartarlo.
5. **VERIFICAR** Parece que algunos contenedores se extienden infinitamente segun el contenido y no tienen un limite.
6. **VERIFICAR** Los inputs numericos estan validados, sin embargo si se ingresan los valores por teclado 
    los mismos no permiten borrar el 1, bien por ahí sin embargo eso no permite colocar que 
    numero sera ingresado.
7. **REALIZAR** Realizar un boton para traer al cuadro de analistas la propuesta del proveedor?

