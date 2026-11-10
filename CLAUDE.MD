# Gesty

App Android (React Native + Expo + TypeScript) para que repartidores registren los envíos de cada turno y sepa cuánto cobra. Funciona 100% offline; los datos viven en el teléfono (expo-sqlite). Se distribuye como APK, no por Play Store.

Está pensada para gente no técnica que la usa en la calle, muchas veces de noche. Todo tiene que ser rápido, grande y legible.

## Documentación del proyecto

- **Especificación completa:** `docs/SPEC.md`. Es la fuente de verdad para reglas de negocio, pantallas e identidad visual. Leela antes de trabajar en cualquier funcionalidad.
- **Diseño de cada pantalla:** `docs/diseno/` (una imagen PNG por pantalla). Antes de construir o modificar una pantalla, mirá su imagen y respetá estructura, jerarquía, tamaños y colores.
- **Logo e ícono:** `assets/logo/*.svg`. Usalos tal cual, no los redibujes. Si una captura muestra un logo distinto, vale el de `assets/logo/`.

Si algo del SPEC y del diseño se contradice, o algo no está definido, preguntá antes de decidir.

## Convenciones

- Toda la interfaz en **español de Argentina** (voseo: "Tenés", "Cerrá").
- Dinero como **enteros** en pesos, nunca float. Formato `$ 3.000`.
- Fechas en 24 h: `Vie 14/11 · 21:05`. Un turno pertenece al día y mes de su inicio, aunque termine después de medianoche.
- Colores y fuentes solo desde el archivo de tema (tokens definidos en `docs/SPEC.md` §5). Nada de colores sueltos en los componentes.
- Lógica de negocio en funciones puras, separada de la UI, con tests.
- Mantener las dependencias al mínimo; si vas a agregar una, explicá por qué.
- Cambios en la base de datos siempre con una migración nueva, nunca editando una existente.
- La app se actualiza por OTA (EAS Update). Si un cambio **no** se puede mandar por OTA (dependencia nativa nueva, ícono, splash, permisos, config nativa de `app.json`, cambio de SDK), avisá explícitamente que va a hacer falta generar un APK nuevo.

## Git

- Repositorio git desde el inicio, con un `.gitignore` adecuado para Expo (`node_modules/`, `.expo/`, builds, `.env*`, keystores).
- **`main` siempre estable:** nunca commitear directo en `main`.
- **Una rama por paso o funcionalidad**, salida de `main`, con prefijo según el tipo:
  - `feat/` funcionalidad nueva (ej. `feat/active-shift-screen`)
  - `fix/` corrección de errores
  - `chore/` configuración, dependencias, tooling (ej. `chore/project-setup`)
  - `test/`, `docs/`, `refactor/` según corresponda
- Nombres de ramas en inglés, en minúsculas y con guiones.
- **Commits cortos y frecuentes, en inglés, con [Conventional Commits](https://www.conventionalcommits.org/):** `tipo(alcance): descripción` en imperativo y minúscula, sin punto final, idealmente menos de 72 caracteres.
  - Ejemplos: `feat(shift): add delivery input with autocomplete`, `fix(history): group shifts by start month`, `chore(eas): configure apk build profile`, `test(totals): cover shift crossing midnight`.
  - Un commit = un cambio lógico. No mezclar cosas distintas en el mismo commit.
- Al terminar una rama (tests y tipos pasando), mergearla a `main` y borrarla.
- **Antes de hacer push, crear un repositorio remoto, o cualquier acción irreversible (force push, borrar ramas remotas, reescribir historial), preguntar.**

## Antes de dar algo por terminado

- Correr los tests y el chequeo de tipos (`npx tsc --noEmit`) y que pasen.
- Si tocaste una pantalla, compararla con su imagen en `docs/diseno/`.