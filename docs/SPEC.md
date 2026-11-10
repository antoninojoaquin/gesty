# Gesty — Especificación

**Gesty** es una app Android hecha con **React Native + Expo** para que repartidores registren los envíos de cada turno y sepan cuánto cobran, sin tener que anotar las direcciones en un chat y contarlas y multiplicarlas a mano al final del turno.

Quien la usa no es una persona técnica y la usa **en la calle, muchas veces de noche, con el celular en la mano y apurada**. La prioridad absoluta es que cargar un pedido sea **más rápido que mandarse un mensaje**.

Referencias visuales:
- Diseño de cada pantalla: `docs/diseno/*.png`
- Logo e ícono: `assets/logo/*.svg`

---

## 1. Stack y restricciones técnicas

- **Expo** (SDK estable más reciente) con **TypeScript**.
- Navegación con **expo-router**.
- Persistencia local con **expo-sqlite**. Sin backend, sin login, sin cuentas.
- **100% offline.** La app no debe necesitar internet para nada (las fuentes se empaquetan con la app).
- Solo **Android**. Se distribuye como **APK** instalado manualmente (no Play Store).
- Package de Android: **`com.joaquin.gesty`** (no se puede cambiar una vez instalado el APK).
- Configurar `eas.json` con un perfil (por ejemplo `preview`) que genere **`.apk`** (`"android": { "buildType": "apk" }`), no `.aab`.
- Interfaz completamente en **español (Argentina)**.
- Formato de dinero argentino: `$ 3.000`, `$ 45.000` (separador de miles con punto, sin decimales).
- Formato de fecha/hora en 24 h: `Vie 14/11 · 21:05`.
- Guardar montos como **enteros** (pesos), nunca como float.
- Mantener las dependencias al mínimo.

### 1.1 Actualizaciones OTA (EAS Update)

El APK se instala una sola vez a mano; los cambios posteriores tienen que llegarle al teléfono **sin reinstalar**.

- Configurar **`expo-updates`** con **EAS Update**, con un canal (por ejemplo `preview`) asociado al perfil de build que genera el APK.
- Comportamiento para el usuario: **automático y silencioso**. Al abrir la app, si hay internet, busca una actualización y la descarga en segundo plano; se aplica la próxima vez que se abre. Sin internet, la app arranca normal con la versión que tiene. Nunca bloquear el inicio esperando una actualización.
- Usar una política de `runtimeVersion` (por ejemplo `fingerprint` o `appVersion`) para que una actualización OTA **nunca** se instale sobre un APK con código nativo incompatible.
- **Qué se puede mandar por OTA:** cambios de JavaScript/TypeScript, pantallas, estilos, textos e imágenes del bundle.
- **Qué requiere un APK nuevo:** agregar o actualizar dependencias con código nativo, cambiar el ícono, el splash, permisos o la configuración nativa de `app.json`, o subir de SDK de Expo.
- Mostrar en Ajustes la versión de la app y un identificador corto de la actualización instalada, para poder saber qué versión tiene el teléfono.
- **Los datos del usuario no se tocan:** viven en SQLite y sobreviven a cualquier actualización. Si una actualización necesita cambiar la base, se hace con una migración.

---

## 2. Modelo de datos

### Turno
| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| inicio | datetime | Se setea al iniciar el turno |
| fin | datetime \| null | null mientras está abierto |
| tarifa | integer | Tarifa por envío **copiada de Ajustes al iniciar el turno**. No cambia aunque después se modifique la tarifa en Ajustes |

### Pedido
| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| turnoId | FK → Turno | |
| direccion | text | Obligatorio, se guarda con trim |
| creadoEn | datetime | Automático al agregar |

### Cierre de mes
| Campo | Tipo | Notas |
|---|---|---|
| id | integer PK | |
| anio | integer | |
| mes | integer | 1–12 |
| cerradoEn | datetime | |

### Ajustes
- `tarifa`: integer, valor por defecto **3000**.

---

## 3. Reglas de negocio

1. **Total del turno = cantidad de pedidos × tarifa del turno.** No hay propinas, extras ni excepciones.
2. **Solo puede haber un turno abierto a la vez.**
3. **El turno pertenece al día y al mes de su `inicio`**, aunque termine pasada la medianoche (ej.: viernes 21:00 → sábado 01:00 es "turno del viernes").
4. Los días de trabajo son irregulares. No hay calendario ni turnos programados: el turno existe solo cuando se inicia desde la app.
5. **Se puede editar la dirección o borrar un pedido** del turno abierto. Borrar pide confirmación.
   - También en un **turno cerrado**, mientras su mes **no esté cerrado**: se pueden editar y borrar pedidos, y **borrar el turno entero**. Toda acción destructiva pide confirmación.
   - Si borrar pedidos deja un turno cerrado con 0 pedidos, se sigue mostrando con total $ 0 hasta que se borre el turno.
6. **Se permiten direcciones repetidas.**
7. **No se puede cerrar un turno con 0 pedidos.** En ese caso ofrecer "Descartar turno" (con confirmación).
8. **Turno olvidado abierto:** si al abrir la app hay un turno abierto con inicio hace más de 12 horas, mostrar un aviso: "Tenés un turno abierto desde el {día} a las {hora}. ¿Lo cerrás?" con opciones "Cerrar turno" y "Seguir con este turno". Al cerrarlo desde ese aviso, el `fin` es la hora del último pedido.
   - Si el turno olvidado tiene **0 pedidos**, no se puede cerrar (regla 7): el aviso ofrece **"Descartar turno"** (con confirmación) en lugar de "Cerrar turno".
9. **Cierre de mes:**
   - Se puede cerrar un mes calendario que **ya terminó** (no el mes en curso), que tenga al menos un turno cerrado y ningún turno abierto.
   - Estados de un mes: **"En curso"** (el mes calendario actual), **"Sin cerrar"** (un mes pasado que todavía no se cerró) y **"Cerrado"** (con candado).
   - Genera un resumen del mes (ver 4.5) y registra el cierre.
   - Los turnos de un mes cerrado quedan **solo lectura**. Se puede **reabrir el mes** (con confirmación) para corregir algo.
10. Cambiar la tarifa en Ajustes **solo afecta a los turnos que se inicien después**. Si hay un turno abierto, avisar: "El turno actual sigue con $X. La nueva tarifa se aplica desde el próximo turno."
11. La tarifa es un **entero mayor que 0**. No se puede guardar vacía ni en 0.

---

## 4. Pantallas y flujos

Cada pantalla tiene su diseño de referencia en `docs/diseno/`. Respetá la estructura, jerarquía, tamaños y colores de esas imágenes. Los datos que aparecen ahí (direcciones, montos, fechas) son de ejemplo.

### 4.1 Inicio (sin turno abierto) — `1-inicio.png`
- Arriba: logo de Gesty (ícono + nombre, de `assets/logo/`) y accesos a **Historial** y **Ajustes** (botones de ícono, 52×52).
- Centro: fecha de hoy, botón circular **enorme** "Iniciar turno" (~260 px de diámetro, rojo) y debajo la tarifa vigente.
- De fondo, detrás del botón, una **banda diagonal roja muy sutil** (opacidad ~16 %) que baja de arriba a la derecha hacia abajo a la izquierda.
- Abajo: tarjeta "Último turno" con fecha, horario, cantidad de envíos y total.

### 4.2 Turno activo (pantalla principal, la más importante) — `2-turno-activo.png`
- Arriba: punto rojo + "Turno en curso · desde 21:05" y la tarifa.
- Arriba a la derecha, dos **íconos chicos** de acceso a **Historial** y **Ajustes** (no están en el diseño; se agregan para poder cambiar la tarifa con un turno abierto, ver regla 10). Van lejos del botón "Agregar" para evitar toques accidentales.
- Tarjeta con **cantidad de envíos** (muy grande) y **total en pesos** (grande, en rojo claro).
- Campo de texto "Dirección" + botón **"Agregar"** grande.
  - El campo tiene foco automático al entrar a la pantalla.
  - Al tocar "Agregar" o Enter en el teclado: guarda, vacía el campo, **mantiene el teclado abierto** y da feedback (vibración corta con `expo-haptics` + el contador se actualiza).
  - Si el campo está vacío, el botón está deshabilitado (gris).
  - **Autocompletar:** mientras escribe (desde 2 caracteres), mostrar hasta 3 sugerencias de direcciones cargadas antes (de cualquier turno), ordenadas por frecuencia, con la cantidad de veces usada. Tocar una la agrega directamente.
- Lista de pedidos del turno, **el más nuevo arriba**, numerados, con hora. Tocar un pedido despliega debajo los botones Editar / Borrar.
- Botón **"Cerrar turno"** abajo de todo, con estilo de contorno (no relleno) para evitar toques accidentales. Pide confirmación mostrando el resumen.

### 4.3 Resumen del turno — `3-resumen.png`
Se muestra al cerrar un turno y al abrir un turno desde el historial.
- Fecha (día de la semana incluido), hora de inicio y fin, duración.
- La duración se escribe siempre con los minutos en dos cifras: `4 h 05 min` (en pantalla y al compartir).
- Si se abre desde el historial y el mes del turno **no está cerrado**, permite editar y borrar pedidos y **borrar el turno** (ver regla 5). Si el mes está cerrado, todo es solo lectura.
- **Total** destacado y "envíos × tarifa".
- Lista de direcciones (las primeras y un "Ver las N direcciones").
- Botón **"Compartir por WhatsApp"** usando la API `Share` de React Native con un texto así:

```
Turno Vie 14/11
21:05 a 01:10 (4 h 05 min)
Envíos: 15
Tarifa: $ 3.000
Total: $ 45.000
```

- Botón "Volver al inicio".

### 4.4 Historial — `4-historial.png`
- Agrupado por mes (el más reciente arriba). Cada mes muestra su total, turnos, envíos y su estado: "En curso", "Sin cerrar" o "Cerrado" (con candado) (ver regla 9).
- Cada turno: **día de la semana + fecha**, cantidad de envíos, total. Tocar → Resumen del turno.
- Botón **"Cerrar mes"** solo en los meses **"Sin cerrar"** (meses pasados). El mes en curso no se puede cerrar.
- Mes cerrado: se muestra resumido, con un link **"Ver turnos de {mes}"** que despliega sus turnos en el mismo lugar. Tocar el encabezado del mes abre su resumen (4.5) con la opción "Reabrir mes".

### 4.5 Cierre de mes — `5-cierre-mes.png`
- Antes de confirmar, mostrar el resumen:
  - Mes y año.
  - **Total del mes**, cantidad de turnos, total de envíos.
  - Promedio de envíos por turno y promedio cobrado por turno. Envíos por turno con un decimal si no es exacto (`13,3`); el promedio cobrado se redondea al peso.
  - Lista de turnos (fecha, envíos, total).
  - Aviso: los turnos quedan solo lectura y se puede reabrir.
- Botones "Confirmar cierre" y "Compartir por WhatsApp" (mismo estilo de texto que el turno):

```
Noviembre 2026
Turnos: 3
Envíos: 39
Total: $ 117.000

Vie 7/11 · 15 envíos · $ 45.000
Sáb 8/11 · 14 envíos · $ 42.000
Dom 9/11 · 10 envíos · $ 30.000
```

- En un mes ya cerrado: ver el mismo resumen y opción "Reabrir mes".

### 4.6 Ajustes — `6-ajustes.png`
- **Tarifa por envío** (input numérico grande, teclado numérico) + "Guardar tarifa". Solo enteros mayores que 0 (regla 11).
- **Respaldo:**
  - **Exportar datos:** genera un archivo JSON con todos los turnos, pedidos, cierres y ajustes, y abre el menú de compartir (`expo-sharing` + `expo-file-system`).
  - **Importar datos:** elegir un JSON exportado (`expo-document-picker`), mostrar cuántos turnos contiene y pedir confirmación porque **reemplaza** los datos actuales.
- Al pie: "Gesty · versión X · funciona sin internet", más el identificador corto de la actualización OTA instalada (ver 1.1). El diseño no muestra el identificador, pero va igual.

---

## 5. Identidad visual

### 5.1 Principios
- **Tema oscuro siempre** (se usa sobre todo de noche). No hay modo claro.
- Paleta **roja y blanca**. La banda diagonal roja aparece solo como guiño sutil: siempre baja **de arriba a la derecha hacia abajo a la izquierda**.
- **Texto grande:** mínimo 16–18 px en cuerpo, 40 px+ para el contador y el total.
- **Botones grandes:** alto mínimo de 52–60 px, área táctil generosa.
- Alto contraste, legible a la intemperie.
- Nada de pantallas intermedias innecesarias: el flujo normal es *abrir app → escribir dirección → Agregar*.
- Confirmaciones solo para acciones destructivas o importantes (borrar pedido, borrar turno, cerrar turno, descartar turno, cerrar/reabrir mes, importar).
- Respetar safe areas y que el teclado no tape el campo ni el botón "Agregar".

### 5.2 Colores (definirlos como tokens en un único archivo de tema)
| Token | Valor | Uso |
|---|---|---|
| `bg` | `#0E0E10` | Fondo de pantalla |
| `surface` | `#19191C` | Tarjetas |
| `surfaceAlt` | `#232327` | Filas dentro de tarjetas, sugerencias |
| `border` | `#34343A` | Bordes de tarjetas, botones de contorno |
| `text` | `#F5F5F7` | Texto principal |
| `textMuted` | `#ABABB2` | Texto secundario, etiquetas |
| `placeholder` | `#85858C` | Placeholder de inputs |
| `accent` | `#E0322A` | Rojo: fondos de botones principales, punto de "en curso", borde de foco. Texto encima siempre blanco `#FFFFFF` |
| `accentText` | `#FF6B5E` | Rojo claro: totales, links y textos destacados sobre fondo oscuro (el rojo puro no tiene contraste suficiente en texto chico) |
| `accentSoft` | `#3A1513` | Fondo de chips/badges rojos (con texto `accentText`) |
| `disabled` | `#2A2A2E` | Fondo de botón deshabilitado (texto `placeholder`) |
| `danger` | `#FF9A85` | Texto del botón "Borrar" (fondo `#2A1914`, borde `#5A2E25`) |

### 5.3 Tipografía
- **Inter** para la interfaz (400, 500, 600, 700).
- **Space Grotesk** (600, 700) para los números grandes: contador de envíos, totales en pesos. Usar números tabulares.
- Cargarlas con `@expo-google-fonts/inter` y `@expo-google-fonts/space-grotesk` (quedan empaquetadas, funcionan offline).
- El logo usa **Nunito**, pero ya está convertido a trazos en los SVG: no hace falta cargar esa fuente.

### 5.4 Logo e ícono
Archivos en `assets/logo/`:
- `gesty-icono.svg`: ícono de la app (G blanca con tilde rojo sobre fondo `#16161A`, esquinas redondeadas).
- `gesty-lockup-oscuro.svg`: ícono + nombre, para fondos oscuros (el que se usa dentro de la app).
- `gesty-icono-foreground.svg`: la G y el tilde sin fondo, ya dentro de la zona segura. Es el foreground del ícono adaptativo.
- `gesty-lockup-claro.svg`: variante del lockup para fondos claros.

En el nombre, la "y" final tiene el tilde en rojo y la cola en blanco: no modificar el logo ni redibujarlo, usar los SVG tal cual.

Usos:
- **Ícono de la app:** exportar `gesty-icono.svg` a PNG 1024×1024 (`assets/icon.png`). Para el **ícono adaptativo de Android**, exportar `gesty-icono-foreground.svg` a PNG 1024×1024 (`assets/adaptive-icon.png`) y usar `#16161A` como `backgroundColor`.
- **Splash screen:** `gesty-lockup-oscuro.svg` centrado sobre `#0E0E10` (con `expo-splash-screen`).
- **Pantalla de Inicio:** el lockup arriba a la izquierda, ~40 px de alto. Para mostrar SVG en la app usar `react-native-svg` (o exportarlo a PNG si es más simple).

> Nota: si en alguna captura de `docs/diseno/` el logo se ve distinto, vale el de `assets/logo/`. Las capturas muestran una versión vieja del logo (una G cortada por una banda y el nombre en minúsculas): ignorarla. El logo correcto tiene una G con un tilde rojo y el nombre "Gesty" con la "y" en forma de tilde rojo.

---

## 6. Calidad

- Separar la lógica de negocio (cálculos de totales, agrupación por mes, asignación de turno a día/mes, formato de dinero y fechas, armado del texto para compartir) en funciones puras, con **tests unitarios** (Jest), incluyendo el caso del turno que cruza la medianoche y el cruce de mes.
- Migraciones de la base versionadas desde el inicio, para poder agregar campos en el futuro sin perder datos.
- Incluir un `README.md` en español con: cómo correr en desarrollo (Expo Go o development build), cómo generar el APK con EAS (`eas build -p android --profile preview`), cómo instalarlo en el teléfono, y cómo **publicar una actualización OTA** (`eas update --channel preview --message "..."`), incluyendo cuándo alcanza con una OTA y cuándo hace falta un APK nuevo.

---

## 7. Orden de trabajo sugerido

1. Crear el proyecto Expo con TypeScript, expo-router, la base SQLite con migraciones y el archivo de tema (colores y fuentes).
2. Lógica de negocio + tests.
3. Pantallas: Inicio → Turno activo → Resumen → Historial → Cierre de mes → Ajustes, comparando cada una con su imagen de `docs/diseno/`.
4. Compartir por WhatsApp, exportar/importar.
5. Ícono, ícono adaptativo y splash a partir de `assets/logo/`.
6. Configurar `eas.json` para APK, `expo-updates` con EAS Update (canal y `runtimeVersion`) y escribir el README.
7. Probar el circuito completo: instalar el APK, publicar un cambio chico por OTA y verificar que le llega al teléfono.

Antes de empezar, si algo de esta especificación es ambiguo o contradictorio, preguntá.