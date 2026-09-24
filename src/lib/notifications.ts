import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getRecordatorioConfig, getTareas } from './db';
import { TODOS_LOS_DIAS } from './schema';

const CHANNEL_ID = 'metas-claras';

export const TITULO_APP = 'Metas Claras';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let channelCreado = false;
async function asegurarCanal() {
  if (Platform.OS !== 'android' || channelCreado) return;
  channelCreado = true;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Alertas de metas',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch {
    // El canal puede fallar si las notificaciones no están disponibles.
  }
}

/** ¿Están concedidos los permisos (sin pedirlos)? */
export async function notificacionesActivadas(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted;
}

/** Pide permiso si hace falta; devuelve si quedó concedido. */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  await asegurarCanal();
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (settings.canAskAgain) {
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  }
  return false;
}

/** Envía una notificación de prueba en 1 segundo. */
export async function enviarPrueba(): Promise<boolean> {
  const ok = await pedirPermisoNotificaciones();
  if (!ok) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: TITULO_APP, body: 'Las alertas están funcionando', sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2 },
  });
  return true;
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
  // Sin permiso concedido no programamos nada (no se molesta al usuario).
  if (!(await notificacionesActivadas())) {
    return;
  }
  await asegurarCanal();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const tareas = await getTareas(db);
  const pendientes: ReturnType<typeof Notifications.scheduleNotificationAsync>[] = [];

  for (const tarea of tareas) {
    if (!tarea.hora) continue;
    const { hour, minute } = parseHora(tarea.hora);

    if (tarea.tipo === 'diaria') {
      pendientes.push(
        Notifications.scheduleNotificationAsync({
          content: { title: tarea.titulo, body: 'Es hora de tu meta', sound: 'default' },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
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
          Notifications.scheduleNotificationAsync({
            content: { title: tarea.titulo, body: 'Es hora de tu meta', sound: 'default' },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
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
            Notifications.scheduleNotificationAsync({
              content: { title: tarea.titulo, body: 'Es hora de tu meta', sound: 'default' },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
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
      Notifications.scheduleNotificationAsync({
        content: { title: TITULO_APP, body: 'Revisa tus metas de hoy', sound: 'default' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: CHANNEL_ID,
        },
      })
    );
  }

  await Promise.allSettled(pendientes);
}