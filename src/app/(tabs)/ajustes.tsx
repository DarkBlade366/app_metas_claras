import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Divider, Switch, Text, useTheme } from 'react-native-paper';

import { AppLogo } from '@/components/app-logo';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PickField } from '@/components/pick-field';
import { Screen } from '@/components/screen';
import { StatCard } from '@/components/stat-card';
import { getEstadisticas, getRecordatorioConfig, pad2, RECORDATORIO_DEFAULT_HORA, setRecordatorioConfig, wipeDatos } from '@/lib/db';
import type { RecordatorioConfig } from '@/lib/db';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';
import { enviarPrueba, notificacionesActivadas, pedirPermisoNotificaciones } from '@/lib/notifications';

function horaToDate(hora: string): Date {
  const [h, m] = hora.split(':').map(Number);
  return new Date(2000, 0, 1, Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0);
}

function dateToHora(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function AjustesScreen() {
  const theme = useTheme();
  const db = useDB();
  const [confirm, setConfirm] = useState(false);
  const [wipeError, setWipeError] = useState<string | null>(null);

  const stats = useDbQuery(() => getEstadisticas(db));
  const [rcfg, setRcfg] = useState<RecordatorioConfig | null>(null);
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const cfg = await getRecordatorioConfig(db);
      if (!vivo) return;
      setRcfg(cfg);
      setPermitido(await notificacionesActivadas());
    })().catch(() => {});
    return () => {
      vivo = false;
    };
  }, [db]);

  const borrarDatos = async () => {
    try {
      await wipeDatos(db);
      setWipeError(null);
      dataChanged();
    } catch {
      setWipeError('No se pudieron borrar los datos. Inténtalo de nuevo.');
    } finally {
      setConfirm(false);
    }
  };

  const cambiarActivo = async (activo: boolean) => {
    if (!rcfg) return;
    if (activo && permitido === false) {
      const ok = await pedirPermisoNotificaciones();
      setPermitido(ok);
      if (!ok) return;
    }
    const next = { ...rcfg, activo };
    setRcfg(next);
    setMsg(null);
    await setRecordatorioConfig(db, next);
    dataChanged();
  };

  const cambiarHora = async (d: Date) => {
    if (!rcfg) return;
    const next = { ...rcfg, hora: dateToHora(d) };
    setRcfg(next);
    setMsg(null);
    await setRecordatorioConfig(db, next);
    dataChanged();
  };

  const probar = async () => {
    setMsg(null);
    const ok = await enviarPrueba();
    setPermitido(ok);
    if (ok) {
      setMsg('Alerta de prueba enviada. Revisa tu teléfono.');
    } else {
      setMsg('Para probarlo primero hay que permitir las notificaciones.');
    }
  };

  const s = stats.data;
  const horaDate = rcfg ? horaToDate(rcfg.hora) : horaToDate(RECORDATORIO_DEFAULT_HORA);

  return (
    <>
      <Screen>
        <View style={styles.header}>
          <AppLogo />
          <View style={styles.headerTitle}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
              Metas Claras
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Versión 1.0.0
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Metas activas"
            value={String(s?.pendientes ?? '–')}
            sublabel={`${s?.diarias ?? 0} diarias`}
            icon="calendar-check"
            tone="primary"
            onPress={() => router.push('/estadistica/metas')}
          />
          <StatCard
            label="Racha"
            value={String(s?.racha ?? 0)}
            sublabel={s && s.racha > 0 ? 'días seguidos' : 'días'}
            icon="fire"
            tone={s && s.racha > 0 ? 'primary' : 'neutral'}
            onPress={() => router.push('/estadistica/racha')}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Hechas hoy"
            value={`${s?.hoyHechas ?? 0}/${s?.hoyTotal ?? 0}`}
            sublabel="avance del día"
            icon="check-circle"
            tone={(s?.hoyTotal ?? 0) > 0 && (s?.hoyHechas ?? 0) === (s?.hoyTotal ?? 0) ? 'primary' : 'warning'}
            onPress={() => router.push('/estadistica/hoy')}
          />
          <StatCard
            label="Generales cumplidas"
            value={String(s?.completadasDeUnaVez ?? 0)}
            sublabel={`${s?.generales ?? 0} en total`}
            icon="target"
            tone="neutral"
            onPress={() => router.push('/estadistica/generales')}
          />
        </View>

        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title="Cómo funcionan las metas"
            titleVariant="titleSmall"
            left={(props) => (
              <MaterialCommunityIcons {...props} name="information-outline" size={24} color={theme.colors.primary} />
            )}
          />
          <Card.Content>
            <InfoLine text="Diarias y semanales se repiten: las diarias cada día y las semanales los días que escojas." />
            <Divider style={styles.divider} />
            <InfoLine text="De día específico se hacen una vez (solo ese día en el calendario); si no se hacen salen con X roja." />
            <Divider style={styles.divider} />
            <InfoLine text="Las generales solo aparecen el día en que las completas; pueden llevar subtareas y fecha límite opcional." />
            <Divider style={styles.divider} />
            <InfoLine text="La racha suma cada día en que completas al menos una meta." />
          </Card.Content>
        </Card>

        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title="Recordatorios"
            titleVariant="titleSmall"
            subtitle="Alertas que llegan a tu teléfono"
            left={(props) => (
              <MaterialCommunityIcons {...props} name="bell-ring-outline" size={24} color={theme.colors.primary} />
            )}
          />
          <Card.Content>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Recordatorio diario
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Un repaso cada día con tus metas
                </Text>
              </View>
              <Switch
                value={rcfg?.activo ?? false}
                onValueChange={cambiarActivo}
                color={theme.colors.primary}
              />
            </View>

            {rcfg?.activo ? (
              <View style={{ marginTop: 12 }}>
                <PickField
                  label="Hora del recordatorio"
                  icon="clock-outline"
                  value={horaDate}
                  mode="time"
                  onChange={cambiarHora}
                />
              </View>
            ) : null}

            {permitido === false ? (
              <Text variant="labelSmall" style={{ color: theme.colors.error, marginTop: 10 }}>
                El permiso de notificaciones está desactivado en tu dispositivo. La prueba y las
                alertas no llegarán si no lo permites.
              </Text>
            ) : null}

            <Button
              mode="outlined"
              icon={() => <MaterialCommunityIcons name="bell-check-outline" size={18} color={theme.colors.primary} />}
              onPress={probar}
              style={styles.testBtn}
            >
              Enviar alerta de prueba
            </Button>
            {msg ? (
              <Text variant="labelSmall" style={{ color: theme.colors.primary, textAlign: 'center', marginTop: 6 }}>
                {msg}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          icon={({ color }) => <MaterialCommunityIcons name="trash-can-outline" size={18} color={color} />}
          onPress={() => setConfirm(true)}
          textColor={theme.colors.error}
          style={styles.dangerBtn}
        >
          Borrar todos los datos
        </Button>

        {wipeError ? (
          <Text variant="labelMedium" style={{ color: theme.colors.error, textAlign: 'center' }}>
            {wipeError}
          </Text>
        ) : null}
      </Screen>

      <ConfirmDialog
        visible={confirm}
        onDismiss={() => setConfirm(false)}
        onConfirm={borrarDatos}
        title="¿Borrar todo?"
        message="Se eliminarán todas tus metas, subtareas y el historial. Esta acción no se puede deshacer."
        confirmLabel="Borrar todo"
        destructive
      />
    </>
  );
}

function InfoLine({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerTitle: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { borderRadius: 16, marginBottom: 16 },
  divider: { marginVertical: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  testBtn: { marginTop: 16, borderRadius: 10 },
  dangerBtn: { borderRadius: 10, borderColor: 'rgba(248,113,113,0.4)' },
});