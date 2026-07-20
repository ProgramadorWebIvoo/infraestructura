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

---

## Pendientes funcionales

5. **VERIFICAR** Parece que algunos contenedores se extienden infinitamente según el contenido y no tienen un límite. **(CHECK)**

6. **VERIFICAR** Los inputs numéricos están validados, sin embargo si se ingresan los valores por teclado los mismos no permiten borrar el 1, bien por ahí sin embargo eso no permite colocar que número será ingresado. **(CHECK)**

8. **REALIZAR** Los proveedores se registran a través de un enlace público de la web, sin embargo no existe otra manera de poder configurar o cambiar el estatus del proveedor, en caso por ejemplo que uno ya no esté disponible, cierre o no sea aceptado más por la empresa, ¿cómo se cambiaría el estatus?

9. **REALIZAR** Al traer las solicitudes de los contratistas automáticamente a los analistas algo a realizar es que se debe concatenar la observación general + las notas de cada producto, cada nota debe estar especificada a qué producto va dirigida y pasar toda la observación de la parte del analista concatenado en su totalidad de esa manera. **(CHECK)**

10. **REALIZAR** Buscador para Usuarios en el sistema, Edición (No se puede hacer SoftDelete, No hay posibilidad de cambio de contraseña tampoco.). También existe un error gráfico donde la cabecera de la Card de Usuarios del Sistema crece de manera indebida y exponencial con poca cantidad de usuarios.

11. **REALIZAR** Mejorar Cabecera del SideBar **(CHECK)**

12. **REALIZAR ESENCIAL** Modificar las tablas utilizadas para que tengan o paginación o límite de muestra de registros y posean la capacidad de mostrar más registros por modales de tablas paginadas. Esto debido a que cuando existan MUCHOS registros la aplicación puede fallar y dejar de ser amigable con el usuario desencadenando en problemas varios. Este mismo problema surge con los elementos SELECT.

13. **OPCIONAL** Mejorar el cambio entre vistas para que la aplicación SPA sea más UserFriendly **(CHECK)**

13. **OPCIONAL / CRÍTICO** Añadir Polling a la aplicación en general para evitar el recargar la web para actualizar datos facilitando su uso y diseño

14. **CRÍTICO** Realizar y Corregir todos los puntos especificados en las auditorías internas de BACKEND y FRONTEND
    - ✅ C1 (Tailwind v4 classes): Resuelto
    - ✅ C2 (.env): Falso positivo
    - ✅ C3 (dependencias no usadas): Resuelto 2026-07-20
    - ✅ C4 (carga archivos no deseados): Resuelto 2026-07-20 (validación triple en FileDropZone)
    - ✅ G1 (InteractiveOrganigrama): Resuelto 2026-07-20 (archivo eliminado)
    - ✅ G2 (fetchs redundantes): Resuelto
    - ✅ G3 (isLoadingApi): Resuelto (skeleton loading)
    - ✅ G4 (activeRole): Resuelto
    - ✅ G5 (doble ;;): Resuelto
    - ✅ M3 (alias @): Resuelto
    - ❌ Pendientes: M2 (strict: false), L1 (lang), L3 (contraste), L4 (aria-label), L5 (rate limiting)

15. **CRÍTICO** No existe un panel GENERAL para realizar la configuración y creación de datos IMPRESCINDIBLES como Materiales, Proveedores, IAs

16. **VERIFICAR** Estado de LOGGERS de BD y evaluación para la creación de vista dedicada a ellos.

17. **REALIZAR / EVALUAR** Evaluar la factibilidad de una Reestructuración base COMPONENTES -> SERVICIOS -> VISTAS para la escalabilidad, mantenimiento y desarrollo de la web.

18. **CORREGIR** Los Tokens JWT no expiran. **(CHECK)**

19. **PRUEBAS** Realizar pruebas a todas las funciones y rutas de la app después de la normalización de la conexión a la API
