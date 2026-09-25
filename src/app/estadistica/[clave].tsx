import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/screen';
import { SEMANTIC } from '@/constants/theme';
import { dayLabel, getEstadisticaResumen, shortDayLabel } from '@/lib/db';
import type { Tarea } from '@/lib/db';
import { useDB, useDbQuery } from '@/lib/db-provider';

const TIPO_ICONO: Record<Tarea['tipo'], string> = {
  diaria: 'repeat-variant',
  semanal: 'calendar-week',
  puntual: 'calendar-star',
  general: 'target',
};

function TipoIcono({ tipo, color }: { tipo: Tarea['tipo']; color: string }) {
  return <MaterialCommunityIcons name={TIPO_ICONO[tipo] as never} size={16} color={color} />;
}

function FilaTarea({
  tarea,
  extra,
}: {
  tarea: Tarea;
  extra?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.fila}>
      <TipoIcono tipo={tarea.tipo} color={theme.colors.primary} />
      <Text
        variant="bodyMedium"
        numberOfLines={2}
        style={[styles.filaTexto, { color: theme.colors.onSurface }]}
      >
        {tarea.titulo}
      </Text>
      {extra ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {extra}
        </Text>
      ) : null}
    </View>
  );
}

export default function EstadisticaResumenScreen() {
  const theme = useTheme();
  const db = useDB();
  const { clave } = useLocalSearchParams<{ clave: string }>();
  const resumenQ = useDbQuery(() => getEstadisticaResumen(db, clave), [clave]);
  const r = resumenQ.data;
  const s = r?.stats;

  const info = (() => {
    switch (clave) {
      case 'racha':
        return { titulo: 'Racha', icon: 'fire', tono: SEMANTIC.success };
      case 'hoy':
        return { titulo: 'Hechas hoy', icon: 'check-circle', tono: SEMANTIC.warning };
      case 'generales':
        return { titulo: 'Generales cumplidas', icon: 'target', tono: SEMANTIC.neutral };
      default:
        return { titulo: 'Metas activas', icon: 'calendar-check', tono: SEMANTIC.success };
    }
  })();

  const valor = (() => {
    if (!s) return '…';
    switch (clave) {
      case 'racha':
        return String(s.racha);
      case 'hoy':
        return `${s.hoyHechas}/${s.hoyTotal}`;
      case 'generales':
        return String(s.completadasDeUnaVez);
      default:
        return String(s.pendientes);
    }
  })();

  const sublabel = (() => {
    if (!s) return '';
    switch (clave) {
      case 'racha':
        return s.racha > 0 ? 'días seguidos' : 'aún no empieza';
      case 'hoy':
        return s.hoyTotal > 0 ? 'avance del día' : 'hoy no toca ninguna';
      case 'generales':
        return `${s.generales} en total`;
      default:
        return `${s.diarias} diarias`;
    }
  })();

  const porTipo = s
    ? [
        { label: 'Diarias', valor: s.diarias, tipo: 'diaria' as const },
        { label: 'Semanales', valor: s.semanales, tipo: 'semanal' as const },
        { label: 'Día específico', valor: s.total - s.diarias - s.semanales - s.generales, tipo: 'puntual' as const },
        { label: 'Generales', valor: s.generales, tipo: 'general' as const },
      ]
    : [];

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.iconCircle, { backgroundColor: `${info.tono}18` }]}>
          <MaterialCommunityIcons name={info.icon as never} size={28} color={info.tono} />
        </View>
        <Text variant="titleLarge" style={[styles.valor, { color: theme.colors.onSurface }]}>
          {valor}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {info.titulo}
        </Text>
        {sublabel ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {sublabel}
          </Text>
        ) : null}
      </View>

      {clave === 'metas' && s ? (
        <>
          <Card mode="outlined" style={styles.card}>
            <Card.Title
              title="Resumen por tipo"
              titleVariant="titleSmall"
              left={(props) => (
                <MaterialCommunityIcons {...props} name="chart-donut" size={24} color={theme.colors.primary} />
              )}
            />
            <Card.Content>
              {porTipo.map((f, i) => (
                <View key={i} style={styles.fila}>
                  <TipoIcono tipo={f.tipo} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={[styles.filaTexto, { color: theme.colors.onSurface }]}>
                    {f.label}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {f.valor}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          <Card mode="outlined" style={styles.card}>
            <Card.Title
              title={`Por hacer (${s.pendientes})`}
              titleVariant="titleSmall"
              left={(props) => (
                <MaterialCommunityIcons {...props} name="format-list-checks" size={24} color={theme.colors.primary} />
              )}
            />
            <Card.Content>
              {r?.activas && r.activas.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {r.activas.map((t) => (
                    <FilaTarea key={t.id} tarea={t} />
                  ))}
                </View>
              ) : (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  No tienes metas activas.
                </Text>
              )}
            </Card.Content>
          </Card>
        </>
      ) : null}

      {clave === 'racha' ? (
        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title={s && s.racha > 0 ? 'Días en tu racha' : 'Tu racha está en cero'}
            titleVariant="titleSmall"
            left={(props) => (
              <MaterialCommunityIcons {...props} name="fire" size={24} color={theme.colors.primary} />
            )}
          />
          <Card.Content>
            {r?.racha && r.racha.dias.length > 0 ? (
              <View style={{ gap: 14 }}>
                {r.racha.dias.map((d) => (
                  <View key={d.fecha}>
                    <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                      {dayLabel(d.fecha)}
                    </Text>
                    <View style={{ gap: 6, marginTop: 4 }}>
                      {d.titulos.map((t, i) => (
                        <View key={i} style={styles.fila}>
                          <TipoIcono tipo={t.tipo} color={theme.colors.primary} />
                          <Text
                            variant="bodyMedium"
                            numberOfLines={2}
                            style={[styles.filaTexto, { color: theme.colors.onSurface }]}
                          >
                            {t.titulo}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Completa una meta hoy o ayer para empezar tu racha.
              </Text>
            )}
          </Card.Content>
        </Card>
      ) : null}

      {clave === 'hoy' ? (
        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title={`Completadas hoy (${s?.hoyHechas ?? 0})`}
            titleVariant="titleSmall"
            left={(props) => (
              <MaterialCommunityIcons {...props} name="check-circle" size={24} color={theme.colors.primary} />
            )}
          />
          <Card.Content>
            {r?.hechasHoy && r.hechasHoy.length > 0 ? (
              <View style={{ gap: 10 }}>
                {r.hechasHoy.map((it) => (
                  <FilaTarea key={it.tarea.id} tarea={it.tarea} />
                ))}
              </View>
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Todavía no completas ninguna hoy.
              </Text>
            )}
          </Card.Content>
        </Card>
      ) : null}

      {clave === 'generales' ? (
        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title={`De una sola vez cumplidas (${s?.completadasDeUnaVez ?? 0})`}
            titleVariant="titleSmall"
            left={(props) => (
              <MaterialCommunityIcons {...props} name="target" size={24} color={theme.colors.primary} />
            )}
          />
          <Card.Content>
            {r?.cumplidas && r.cumplidas.length > 0 ? (
              <View style={{ gap: 10 }}>
                {r.cumplidas.map((it) => (
                  <FilaTarea key={it.tarea.id} tarea={it.tarea} extra={`el ${shortDayLabel(it.completadaEl)}`} />
                ))}
              </View>
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Aún no cumples ninguna meta de una sola vez.
              </Text>
            )}
          </Card.Content>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 2, marginTop: 8, marginBottom: 24 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  valor: { fontWeight: '800' },
  card: { borderRadius: 16, marginBottom: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filaTexto: { flex: 1 },
});