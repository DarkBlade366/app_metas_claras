import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getRecordatorioConfig, getTareas } from './db';
import { getIssuesActivos, getIssuesRecordatorioConfig } from './proyectos';
import { TODOS_LOS_DIAS } from './schema';

type NotificationsModule = typeof import('expo-notifications');

const CHANNEL_ID = 'metas-claras';

export const TITULO_APP = 'Metas Claras';

/**
 * expo-notifications tira un error al importarse en Android dentro de Expo Go
 * (SDK 53+: se quitó el soporte de push remoto). Ese error es fatal a nivel de
 * módulo, así que se carga bajo demanda y con guardas: la app nunca se cae por
 * notificaciones, solo quedan desactivadas donde no están disponibles.
 */
let modulo: NotificationsModule | null | undefined;
let handlerConfigurado = false;

function cargarModulo(): NotificationsModule | null {
  if (modulo !== undefined) return modulo;
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    modulo = null;
    return null;
  }
  try {
    // Carga perezosa: evita ejecutar el módulo al arrancar la app.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modulo = require('expo-notifications') as NotificationsModule;
    if (modulo && !handlerConfigurado) {
      handlerConfigurado = true;
      modulo.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch {
    modulo = null;
  }
  return modulo ?? null;
}

let channelCreado = false;
async function asegurarCanal() {
  const mod = cargarModulo();
  if (Platform.OS !== 'android' || channelCreado || !mod) return;
  channelCreado = true;
  try {
    await mod.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Alertas de metas',
      importance: mod.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {
    // El canal puede fallar si las notificaciones no están disponibles.
  }
}

/** ¿Están concedidos los permisos (sin pedirlos)? */
export async function notificacionesActivadas(): Promise<boolean> {
  const mod = cargarModulo();
  if (!mod) return false;
  try {
    const settings = await mod.getPermissionsAsync();
    return settings.granted;
  } catch {
    return false;
  }
}

/** Pide permiso si hace falta; devuelve si quedó concedido. */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  const mod = cargarModulo();
  if (!mod) return false;
  await asegurarCanal();
  try {
    const settings = await mod.getPermissionsAsync();
    if (settings.granted) return true;
    if (settings.canAskAgain) {
      const req = await mod.requestPermissionsAsync();
      return req.granted;
    }
  } catch {
    return false;
  }
  return false;
}

/** Envía una notificación de prueba en 1 segundo. */
export async function enviarPrueba(): Promise<boolean> {
  const mod = cargarModulo();
  const ok = await pedirPermisoNotificaciones();
  if (!ok || !mod) return false;
  try {
    await mod.scheduleNotificationAsync({
      content: { title: TITULO_APP, body: 'Las alertas están funcionando', sound: 'default' },
      trigger: { type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
    });
    return true;
  } catch {
    return false;
  }
}

function parseHora(hora: string): { hour: number; minute: number } {
  const [h, m] = hora.split(':').map(Number);
  return {
    hour: Math.min(23, Math.max(0, Number.isFinite(h) ? h : 0)),
    minute: Math.min(59, Math.max(0, Number.isFinite(m) ? m : 0)),
  };
}

/**
 * Reelabora todas las alertas programadas según las metas guardadas:
 * una por cada hora de meta (diaria: cada día; semanal: sus días) y, si está
 * activo, el recordatorio diario de repaso. Primero cancela lo anterior.
 */
export async function syncNotificaciones(db: SQLiteDatabase): Promise<void> {
  const mod = cargarModulo();
  // Sin soporte o sin permiso concedido no programamos nada.
  if (!mod || !(await notificacionesActivadas())) {
    return;
  }
  await asegurarCanal();
  try {
    await mod.cancelAllScheduledNotificationsAsync();
  } catch {
    return;
  }

  const tareas = await getTareas(db);
  const pendientes: ReturnType<typeof mod.scheduleNotificationAsync>[] = [];

  for (const tarea of tareas) {
    if (!tarea.hora) continue;
    const { hour, minute } = parseHora(tarea.hora);

    if (tarea.tipo === 'diaria') {
      pendientes.push(
        mod.scheduleNotificationAsync({
          content: { title: tarea.titulo, body: 'Es hora de tu meta', sound: 'default' },
          trigger: {
            type: mod.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: CHANNEL_ID,
          },
        })
      );
    } else if (tarea.tipo === 'semanal') {
      const dias = tarea.diasSemana.length > 0 ? tarea.diasSemana : TODOS_LOS_DIAS;
      for (const dia of dias) {
        // El trigger semanal usa 1=domingo … 7=sábado; aquí 0=domingo.
        pendientes.push(
          mod.scheduleNotificationAsync({
            content: { title: tarea.titulo, body: 'Es hora de tu meta', sound: 'default' },
            trigger: {
              type: mod.SchedulableTriggerInputTypes.WEEKLY,
              weekday: dia + 1,
              hour,
              minute,
              channelId: CHANNEL_ID,
            },
          })
        );
      }
    } else {
      if (tarea.fecha && !tarea.completada) {
        const [y, m, d] = tarea.fecha.split('-').map(Number);
        const fecha = new Date(y, m - 1, d, hour, minute);
        if (fecha.getTime() > Date.now()) {
          pendientes.push(
            mod.scheduleNotificationAsync({
              content: { title: tarea.titulo, body: 'Es hora de tu meta', sound: 'default' },
              trigger: {
                type: mod.SchedulableTriggerInputTypes.DATE,
                date: fecha,
                channelId: CHANNEL_ID,
              },
            })
          );
        }
      }
    }
  }

  const config = await getRecordatorioConfig(db);
  if (config.activo && tareas.length > 0) {
    const { hour, minute } = parseHora(config.hora);
    pendientes.push(
      mod.scheduleNotificationAsync({
        content: { title: TITULO_APP, body: 'Revisa tus metas de hoy', sound: 'default' },
        trigger: {
          type: mod.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: CHANNEL_ID,
        },
      })
    );
  }

  // Issues por resolver (pestaña Proyectos): a cada hora elegida por el
  // usuario suena si quedan issues sin resolver en algún proyecto. Como un
  // DAILY no puede depender del estado de la BD en el momento de sonar, solo
  // se programa mientras existan issues abiertos; al resolver el último, el
  // próximo sync cancela las alertas.
  const issuesCfg = await getIssuesRecordatorioConfig(db);
  if (issuesCfg.activo && issuesCfg.horas.length > 0) {
    const issues = await getIssuesActivos(db);
    const abiertos = issues.filter((i) => i.estado === 'abierto').length;
    if (abiertos > 0) {
      for (const hora of issuesCfg.horas) {
        const { hour, minute } = parseHora(hora);
        pendientes.push(
          mod.scheduleNotificationAsync({
            content: {
              title: TITULO_APP,
              body: `Quedan ${abiertos} ${abiertos === 1 ? 'issue' : 'issues'} por resolver`,
              sound: 'default',
            },
            trigger: {
              type: mod.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
              channelId: CHANNEL_ID,
            },
          })
        );
      }
    }
  }

  await Promise.allSettled(pendientes);
}