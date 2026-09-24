# Metas Claras

Aplicación móvil (Expo / React Native) para organizar metas diarias, semanales y
generales con subtareas, calendario, racha y recordatorios locales.

## Funcionalidades

- **Hoy**: vista del día con tus metas pendientes, completadas y atrasadas,
  barra de avance y navegación entre días.
- **Metas**: lista de todas tus metas filtrable por tipo (diarias, semanales,
  generales), con estado de hoy.
- **Calendario**: mes con marcas por tipo de meta; cada día muestra sus metas.
- **Ajustes**: estadísticas (metas activas, racha, avance de hoy), recordatorio
  diario opcional, alertas de prueba y borrado de datos.
- **Metas generales**: fecha límite y subtareas.
- **Recordatorios**: alertas locales en la hora que definas por meta y un
  repaso diario opcional.

## Tipos de meta

- **Diaria** — se repite todos los días.
- **Semanal** — se repite cada semana en los días que marques.
- **General** — meta de una sola vez con fecha límite y subtareas.

## Requisitos

- Node.js y npm
- [Expo](https://docs.expo.dev) (SDK 57)
- Para probar notificaciones locales en Android se recomienda un
  [development build](https://docs.expo.dev/develop/development-builds/introduction/).

## Puesta en marcha

```bash
npm install
npx expo start
```

En la salida encontrarás opciones para abrir la app en web, un emulador o
Expo Go.

## Comandos útiles

```bash
npx expo start          # servidor de desarrollo
npx expo lint           # lint
npx tsc --noEmit        # verificación de tipos
npx expo-doctor         # diagnóstico de dependencias y configuración
npx expo install --fix  # corregir versiones de paquetes
```

## Estructura

```
src/
  app/          rutas de Expo Router (cada archivo es una pantalla)
  components/   componentes reutilizables
  constants/    tema y colores
  lib/          base de datos (expo-sqlite), proveedor y notificaciones
```

Los datos se guardan localmente con `expo-sqlite` (tareas, subtareas y logros);
no se necesita backend.