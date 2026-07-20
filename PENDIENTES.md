## Pendientes funcionales

## ✅DONE✅ ------
1. **VERIFICAR** ✅ Parece que algunos contenedores se extienden infinitamente según el contenido y no tienen un límite. 

2. **VERIFICAR** ✅ Los inputs numéricos están validados, sin embargo si se ingresan los valores por teclado los mismos no permiten borrar el 1, bien por ahí sin embargo eso no permite colocar que número será ingresado. 

3. **REALIZAR** ✅ Al traer las solicitudes de los contratistas automáticamente a los analistas algo a realizar es que se debe concatenar la observación general + las notas de cada producto, cada nota debe estar especificada a qué producto va dirigida y pasar toda la observación de la parte del analista concatenado en su totalidad de esa manera. 

4. **REALIZAR** ✅ Mejorar Cabecera del SideBar 

5. **REALIZAR ESENCIAL** ✅ Modificar las tablas utilizadas para que tengan o paginación o límite de muestra de registros y posean la capacidad de mostrar más registros por modales de tablas paginadas. Esto debido a que cuando existan MUCHOS registros la aplicación puede fallar y dejar de ser amigable con el usuario desencadenando en problemas varios. Este mismo problema surge con los elementos SELECT.

6. **OPCIONAL** ✅ Mejorar el cambio entre vistas para que la aplicación SPA sea más UserFriendly 

8. **CRÍTICO** ✅ Realizar y Corregir todos los puntos especificados en las auditorías internas de BACKEND y FRONTEND
    - ✅ C1 (Tailwind v4 classes): Resuelto 2026-07-20
    - ✅ C2 (.env): Falso positivo
    - ✅ C3 (dependencias no usadas): Resuelto 2026-07-20
    - ✅ C4 (carga archivos no deseados): Resuelto 2026-07-20 (validación triple en FileDropZone)
    - ✅ G1 (InteractiveOrganigrama): Resuelto 2026-07-20
    - ✅ G2 (fetchs redundantes): Resuelto
    - ✅ G3 (isLoadingApi): Resuelto (skeleton loading)
    - ✅ G4 (activeRole): Resuelto
    - ✅ G5 (doble ;;): Resuelto
    - ✅ M2 (strict: true): Resuelto 2026-07-20
    - ✅ M3 (alias @): Resuelto
    - ✅ M4 (setMaterialsCatalog never[]): Resuelto 2026-07-20
    - ✅ M8 (código comentado legacy): Resuelto 2026-07-20
    - ✅ L1 (html lang): Resuelto 2026-07-20
    - ✅ L3 (contraste text-slate-400): Resuelto 2026-07-20
    - ✅ L4 (aria-label icon buttons): Resuelto 2026-07-20
    - ✅ L5 (rate limiting login): Resuelto 2026-07-20

9. **REALIZAR / EVALUAR** ✅ Evaluar la factibilidad de una Reestructuración base COMPONENTES -> SERVICIOS -> VISTAS para la escalabilidad, mantenimiento y desarrollo de la web.

10. **CORREGIR**  ✅ Los Tokens JWT no expiran. 
 
# PENDIENTE ----

1. **REALIZAR** Los proveedores se registran a través de un enlace público de la web, sin embargo no existe otra manera de poder configurar o cambiar el estatus del proveedor, en caso por ejemplo que uno ya no esté disponible, cierre o no sea aceptado más por la empresa, ¿cómo se cambiaría el estatus?

2. **REALIZAR** Buscador para Usuarios en el sistema, Edición (No se puede hacer SoftDelete, No hay posibilidad de cambio de contraseña tampoco.)

3. **OPCIONAL / CRÍTICO** Añadir Polling a la aplicación en general para evitar el recargar la web para actualizar datos facilitando su uso y diseño

4. **CRÍTICO** No existe un panel GENERAL para realizar la configuración y creación de datos IMPRESCINDIBLES como Materiales, Proveedores, IAs

5. **PRUEBAS** Realizar pruebas a todas las funciones y rutas de la app después de la normalización de la conexión a la API

6. **REALIZAR / URGENTE** Funcion de busqueda en la tabla de AUDITORIA y POLLING
