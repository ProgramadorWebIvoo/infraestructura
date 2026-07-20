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

7. **PREGUNTAR** Realizar un boton para traer al cuadro de analistas la propuesta del proveedor?

8. **PREGUNTAR** Los proveedores se registran a través de un enlace publico de la web, sin embargo no existe otra manera de poder configurar o cambiar el estatus del proveedor, en caso por ejemplo que uno ya no este disponible, cierre o no sea aceptado mas por la empresa, como se cambiaria el estatus?

9. **REALIZAR** Al traer las solicitudes de los contratistas automaticamente a los analistas algo a realizar es que se debe concatenar la observacion general + las notas de cada producto, cada nota debe estar especificado a que producto va dirigida y pasar toda la observacion de la parte del analista concatenado en su totalidad de esa manera.

10. **REALIZAR** Buscador para Usuarios en el sistema, Edición (No se puede hacer SoftDelete, No hay posibilidad de cambio de contraseña tampoco.). Tambien existe un error grafico donde la cabecera de la Card de Usuarios del Sistema crece de manera indebida y expnencial con poca cantidad de usuarios.

11. **REALIZAR** Mejorar Cabecera del SideBar

12. **REALIZAR ESENCIAL** Modificar las tablas de utilizadas para que tengan o paginación o limite de muestra de registros y poseea la capacidad de mostrar mas registros por modales de tablas paginadas, Esto debido a que cuando existan MUCHOS registros la aplicación pude fallar y dejar de ser amigable con el usuario desencadenando en problemas varios. Este mismo problema surge con los elementos SELECT.

13. **OPCIONAL** Mejorar el cambio entre vistas para que la aplicacion SPA sea mas UserFriendly

13. **OPCIONAL / CRITICO** Añadir Polling a la aplicacion en general para evitar el recargar la web para actualizar datos facilitando su uso y diseño

14. **CRITICO** Realizar y Corregir todos los puntos especificados en las auditorias internas de BACKEND y FRONTEND

15. **CRITICO** No existe un panel GENERAL para realizar la configuración y creacion de datos IMPRESINDIBLES como Materiales, Proveedores, IAs

16. **VERIFICAR** Estado de LOGGERS de BD y evaluación para la creacion de vista dedicada a ella.

17. **REALIZAR / EVALUAR** Evaluar la factibilidad de una Reestructuracion base COMPONENTES -> SERVICIOS -> VISTAS para la escalabilidad, mantenimiento y desarrollo de la web.

18. **CORREGIR** Los Tokens JWT no expiran.