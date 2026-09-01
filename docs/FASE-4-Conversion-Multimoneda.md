# 💱 FASE 4: Conversión Multi-Moneda e Integración de Bs.

**Estado:** ✅ Vistas internas completadas · ⚠️ Proveedores con cambios sin commitear
**Última actualización:** 2026-08-31

---

## 📋 RESUMEN

Integración de la conversión de montos a bolívares en todas las vistas operativas,
más la corrección de un conjunto de bugs de moneda en el flujo de propuestas de
proveedores (portal público → import → cuadro comparativo).

### Commits de esta fase

| Commit | Alcance |
|---|---|
| `d82cd70` | FEAT(4.1) Conversión a Bs. en INFRAESTRUCTURA + fix de redondeo global |
| `2405ee2` | PERF Optimización: Table, navbar y contextos globales |
| `3402ba1` | FEAT(4.2) Conversión a Bs. en CIERRE DE OBRA (Revisión y Auditoría) |
| `8b27e03` | FEAT(4.3) Conversión a Bs. en PROCURA |
| `7e465ac` | FEAT(4.4) Conversión a Bs. en ANALISTAS + estandarización de `BsAmount` |
| *(pendiente)* | Conversión multi-moneda en PROVEEDORES (backend + frontend) |

---

## 🧩 Piezas base creadas

### `useCurrencyConversion` (hook)
Agnóstico de moneda desde el inicio — no asume USD como base.

- `convert(amount, fromCode)` → monto en Bs.
- `convertBetween(amount, from, to)` → conversión entre dos monedas cualquiera,
  usando el bolívar como pivote común
- `formatBs(value)` → formato es-VE (miles con `.`, decimales con `,`), 2 decimales
  fijos, **truncado, nunca redondeado**

### `BsAmount` (componente)
Fuente única de verdad para mostrar la conversión a Bs.: mismo estilo, mismo
skeleton de carga y mismo fade-in en toda la app. Variantes `block` (línea bajo el
monto) e `inline` (dentro de texto corrido, entre paréntesis).

### `OriginalAmount` (componente)
Muestra el monto ORIGINAL con el que cotizó un proveedor cuando su propuesta llegó
en otra moneda y fue convertida al importar.

### `ExchangeRatesProvider` (contexto)
Un solo fetch de tasas por sesión. Antes cada componente que mostraba un monto
instanciaba su propio `useAuth()` + `useExchangeRates()` — con la conversión
integrada en casi todas las vistas, eso eran decenas de validaciones de sesión y
decenas de GET `/exchange-rates` pidiendo el mismo dato. Mismo patrón y misma
motivación que `PublicSettingsProvider`.

---

## 🐛 Bugs encontrados y corregidos

### 1. Redondeo de montos (global)
`formatCurrency`/`formatNumber` redondeaban vía `toLocaleString`. Se agregó
`truncateToDecimals()` en `@ivoo/shared` y ahora **truncan**: regla de negocio
"los montos nunca se redondean".

### 2. Conversión EUR → USD calculada con la tasa equivocada 🔴 CRÍTICO
`exchange_rates.rate_to_usd` guarda, pese a su nombre, la **tasa BCV en bolívares
por unidad de moneda** (es lo que sincronizan `DolarVzlaApiFetcher` y
`BcvScraperFetcher`, para USD y para EUR por igual).

`ProposalLineNormalizer` la usaba como si fuera "tasa a dólares":

```php
'unit_price_usd' => round($unitPrice * $fxRate, 4)  // ❌ 500 EUR × 862 = 431.000 "USD"
```

**Corrección:** nuevo `ExchangeRate::rateBetween($from, $to, $at)`, que usa el
bolívar como pivote (`bcvRateFor(from) / bcvRateFor(to)`). También se corrigió
`CurrencyController::base()`, que tenía el mismo bug latente (dormido solo porque
la base nunca dejó de ser USD).

### 3. El import de propuestas no convertía nada 🔴 CRÍTICO
`SupplierProposalImportService` sumaba el JSON crudo `items` y guardaba el total
**en la moneda original**, etiquetando el registro con `quote_currency` — pero el
resto del sistema (semáforo de presupuesto, cuadro comparativo, adjudicación) lee
`material_cost`/`labor_cost`/`total_cost` asumiendo que están en la moneda base.
Una oferta en EUR competía contra una en USD como si fueran la misma unidad.

Además ignoraba las líneas ya normalizadas (`supplier_material_proposal_lines`,
que sí tenían el valor convertido) y volvía a sumar desde cero.

### 4. `fx_rate_to_usd` hardcodeado a `1.0` en el histórico de precios
`savePriceHistory()` escribía `'fx_rate_to_usd' => 1.0, 'fx_rate_source' => 'usd_only'`
con un comentario "MVP: sin conversión", contradiciendo el valor real ya calculado
en la línea. Ahora usa `$line->fx_rate_to_usd` y marca la fuente real (`bcv_rate`).

### 5. Montos en moneda del proveedor rotulados como USD
`InspectSupplierProposalModal` mostraba columnas **"PROP (USD)"** con `$`
hardcodeado sobre montos que están en la moneda que eligió el proveedor.

### 6. Suma de propuestas en monedas distintas
`SupplierProposalsList` sumaba `items[].totalPrice` de todas las propuestas de un
proyecto sin convertir: 1000 USD + 900 EUR = "1900". Ahora convierte a una moneda
común antes de sumar.

### 7. Regresión propia: `memo()` en `NotificationBell`
El `memo()` que agregué en la ronda de optimización rompía 2 tests que mockean
`useNotifications` (con props iguales, memo omite el render y el componente nunca
ve el mock nuevo). Revertido: su beneficio real era marginal — props estáticas, y
el re-render que importa viene del contexto, que `memo` no bloquea.

---

## 🗄️ Cambios de esquema (backend)

Migración `2026_08_31_130000_add_currency_conversion_trace_to_project_proposals_table`:

| Columna | Propósito |
|---|---|
| `material_cost_original` | Monto de materiales tal como lo cotizó el proveedor |
| `labor_cost_original` | Ídem, mano de obra |
| `total_cost_original` | Ídem, total |
| `fx_rate_to_base` | Tasa exacta usada al importar (no la de hoy) |
| `base_currency_at_import` | Qué moneda era la base en ese momento |

Todas nullable: solo se pueblan cuando realmente hubo conversión.

**Por qué `base_currency_at_import`:** sin ese dato, si mañana la base cambia de USD
a EUR, un registro viejo con solo `fx_rate_to_base` sería ambiguo — no se podría
saber contra qué base se calculó. Con él, el histórico completo sigue siendo
interpretable sin importar cuántas veces cambie la base.

**Trazabilidad:** ninguna conversión destruye el dato original. Siempre se puede
auditar qué ofertó el proveedor, en qué moneda, y con qué tasa se convirtió.

---

## ⚡ Optimización de rendimiento (commit `2405ee2`)

Motivada por lentitud reportada en dispositivo de bajos recursos y con CPU throttling.

- **`Table.tsx`**: `SortIcon`/`PaginationBar` se redefinían dentro del cuerpo del
  componente (React los trataba como tipo nuevo en cada render → desmontaje y
  remontaje del subárbol). Extraídos y memoizados. Eliminado `layout` FLIP por fila.
- **Navbar**: `SidebarNav` estaba envuelto en `memo()` **sin efecto real** — sus
  props (`canAccess`, `onLogout`, `onMenuClick`) se recreaban en cada render del
  padre. Ahora usan `useCallback`.
- **Contextos globales**: `ToastProvider`, `PublicSettingsProvider` y
  `NotificationsProvider` pasaban `value={{...}}` inline sin `useMemo` — cualquier
  render suyo se propagaba a **todos** los consumidores de toda la app.

---

## ✅ Estado de tests

**Backend:** 564 pasando. 14 fallos preexistentes en `SyncExchangeRatesTest`
resueltos parcialmente (setUp duplicaba monedas ya sembradas por migración).

**Frontend:** 1096 pasando, 1 fallo preexistente (`useProveedores.test.ts`).

Tests actualizados por cambio de semántica de tasas (asumían la interpretación
vieja "tasa directa a USD"):
- `SupplierProposalCatalogSyncTest::test_non_usd_quote_is_converted_using_latest_exchange_rate`
- `CurrencyTest::test_base_endpoint_returns_rate_for_non_usd_base`
- `SupplierInvitationTest::test_import_supplier_proposals_as_project_proposals`

---

## ⚠️ Deuda técnica detectada (NO resuelta)

### `symfony/dom-crawler` no está instalado 🔴
`BcvScraperFetcher` hace `use Symfony\Component\DomCrawler\Crawler` pero el paquete
**no está en `composer.json` ni instalado**. Esto significa que el fallback de
scraping BCV **fallaría con error fatal en producción** si la API de DolarVZLA cae
— justamente el escenario para el que existe el fallback.

→ Requiere `composer require symfony/dom-crawler` (4 tests dependen de esto).

### Sintaxis de mock incompatible con la versión de PHPUnit
2 tests usan `->willThrow()`, método inexistente en la versión instalada.

### Doble semántica histórica en `exchange_rates.rate_to_usd`
El nombre de la columna sugiere "tasa a dólares" pero el dato real es "tasa BCV a
bolívares". Se resolvió a nivel de código (`rateBetween` documenta la semántica
real), pero el nombre de la columna sigue siendo engañoso para quien lea el esquema.

---

## 📌 Pendiente inmediato

Los cambios de **PROVEEDORES** (backend + frontend) están implementados y con tests
en verde, pero **sin commitear**.
