# Gesty

App Android para que repartidores registren los envíos de cada turno y sepan cuánto cobran. Funciona 100 % offline: los datos viven en el teléfono (SQLite). Se distribuye como APK, no por Play Store.

La especificación completa está en [`docs/SPEC.md`](docs/SPEC.md).

## Desarrollo

Requisitos: Node.js LTS y la app **Expo Go** en un teléfono Android (misma red Wi-Fi que la compu).

```bash
npm install
npx expo start
```

Escaneá el código QR con Expo Go. Si instalaste una dependencia nueva y algo se ve raro, reiniciá con la caché limpia: `npx expo start -c`.

- **Datos de prueba:** en desarrollo, mantené apretado el logo de la pantalla de Inicio.
- **Tests:** `npm test`
- **Chequeo de tipos:** `npm run typecheck`
- **Logos:** los PNG de `assets/` (ícono, ícono adaptativo, splash, logo de Inicio) se generan desde los SVG de `assets/logo/` con `npm run export-logos`. No se editan a mano.

> En Expo Go no se ven el ícono ni el splash propios de Gesty, ni funcionan las actualizaciones OTA. Para eso hace falta el APK.

## Configuración de EAS (una sola vez)

```bash
npm install -g eas-cli
eas login              # con tu cuenta de Expo
eas init               # crea el proyecto en Expo y agrega su id a app.json
eas update:configure   # agrega la URL de actualizaciones a app.json
```

Commiteá los cambios que esos comandos hacen en `app.json`.

## Generar el APK

```bash
eas build -p android --profile preview
```

El build corre en los servidores de Expo y tarda unos minutos. Al terminar, la consola muestra un link y un código QR para descargar el `.apk`.

La primera vez, EAS pregunta si genera la clave de firma (keystore): respondé que sí. EAS la guarda y la reusa en cada build. **Es importante:** un APK nuevo solo se puede instalar encima del anterior si está firmado con la misma clave.

## Instalar en el teléfono

1. Abrí el link (o escaneá el QR) desde el teléfono y descargá el `.apk`.
2. Abrilo. Android va a pedir permiso para instalar apps de origen desconocido: habilitalo para el navegador (o la app desde donde lo abriste).
3. Instalar.

Para pasar a un APK nuevo, instalalo **encima** del que ya está. **No desinstales la app:** desinstalar borra todos los datos. Por las dudas, antes de instalar un APK nuevo hacé un respaldo desde Ajustes → Exportar datos.

## Publicar una actualización OTA

```bash
eas update --channel preview --message "Descripción corta del cambio"
```

El teléfono busca actualizaciones cada vez que se abre la app (si tiene internet), la descarga en segundo plano y la aplica **la próxima vez que se abre**. Así que, para verla: abrir la app, esperar unos segundos, cerrarla del todo y volver a abrirla. Sin internet la app arranca normal con la versión que tiene.

Para saber qué tiene instalado un teléfono, mirá el pie de Ajustes: la versión de la app y, si está corriendo una actualización OTA, `Actualización xxxxxxxx` (los primeros 8 caracteres del id de la actualización, el mismo que muestra `eas update:list`). Si no aparece esa línea, está corriendo el código que vino con el APK.

Los datos del usuario no se tocan con ninguna actualización. Si un cambio necesita modificar la base, va con una migración nueva.

### ¿OTA o APK nuevo?

**Alcanza con una OTA** para cambios de JavaScript/TypeScript: pantallas, estilos, textos, lógica, migraciones de la base e imágenes que usa la app.

**Hace falta un APK nuevo** para:

- agregar o actualizar una dependencia con código nativo (por ejemplo, un paquete `expo-*` nuevo),
- cambiar el ícono o el splash,
- cambiar permisos o la configuración nativa de `app.json`,
- subir de versión el SDK de Expo.

La app usa `runtimeVersion` con política `fingerprint`: EAS calcula una huella del código nativo. Si un cambio la modifica, la OTA queda publicada para esa huella nueva y **los APK viejos no la reciben** (así nunca se rompe una app instalada). En ese caso, generá e instalá un APK nuevo.

## Licencia

El código está bajo licencia MIT (ver [`LICENSE`](LICENSE)). El nombre Gesty, el logo y los diseños de `docs/diseno/` no están incluidos en esa licencia.
