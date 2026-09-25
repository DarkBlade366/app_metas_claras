import type { SQLiteDatabase } from 'expo-sqlite';

import type { Logro, Priority, Subtarea, Tarea, TaskType } from './schema';
import { DIAS_SEMANA_NOMBRES, TODOS_LOS_DIAS } from './schema';

export type { Priority, Subtarea, Tarea, TaskType };

export interface TareaWrite {
  titulo: string;
  descripcion: string | null;
  tipo: TaskType;
  diasSemana: number[];
  fecha: string | null;
  hora: string | null;
  prioridad: Priority;
}

/** Tarea "del día" con su estado de ese día y el avance de sus subtareas. */
export interface TareaDelDia {
  tarea: Tarea;
  hecha: boolean;
  subtotal: number;
  subhechas: number;
}

export interface DiaResult {
  fecha: string;
  total: number;
  hechas: number;
  pendientes: TareaDelDia[];
  noHechas: TareaDelDia[];
}

export interface MarcaDia {
  diaria: boolean;
  semanal: boolean;
  puntual: boolean;
  general: boolean;
}

export interface Estadisticas {
  total: number;
  pendientes: number;
  completadasDeUnaVez: number;
  diarias: number;
  semanales: number;
  generales: number;
  hoyHechas: number;
  hoyTotal: number;
  racha: number;
}

// ------------------------------------------------------------------ Helpers

function parseDias(value: string | null | undefined): number[] {
  return (value ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

function mapTarea(row: Record<string, unknown>): Tarea {
  return {
    id: row.id as number,
    titulo: row.titulo as string,
    descripcion: (row.descripcion as string | null) ?? null,
    tipo: row.tipo as TaskType,
    diasSemana: parseDias(row.diasSemana as string | null),
    fecha: (row.fecha as string | null) ?? null,
    hora: (row.hora as string | null) ?? null,
    prioridad: (row.prioridad as Priority) ?? 'media',
    color: (row.color as string) ?? '#B39DFF',
    completada: (row.completada as number) === 1,
    completadaEn: (row.completadaEn as string | null) ?? null,
    creadaEn: (row.creadaEn as string) ?? '',
    posicion: row.posicion as number,
  };
}

const TAREA_COLUMNS = `
  id, titulo, descripcion, tipo, dias_semana AS diasSemana, fecha, hora,
  prioridad, color, completada, completada_en AS completadaEn,
  creada_en AS creadaEn, posicion`;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Clave local de un día (YYYY-MM-DD). */
export function localDayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return localDayKey(new Date());
}

/** Suma/resta días a una clave YYYY-MM-DD. */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return localDayKey(date);
}

/** Día de la semana (0=domingo) de una clave YYYY-MM-DD. */
export function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function shortDayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d)
    .toLocaleDateString('es-CU', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace('.', '');
}

export function weekdayNames(dias: number[]): string {
  const names = dias
    .map((d) => DIAS_SEMANA_NOMBRES[d])
    .map((n) => n.slice(0, 3));
  if (names.length === 7) return 'todos los días';
  return names.join(', ');
}

// ---------------------------------------------------------------- Tareas CRUD

export async function getTareas(db: SQLiteDatabase): Promise<Tarea[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${TAREA_COLUMNS} FROM tareas ORDER BY posicion ASC, titulo COLLATE NOCASE ASC`
  );
  return rows.map(mapTarea);
}

export async function getTarea(db: SQLiteDatabase, id: number): Promise<Tarea | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${TAREA_COLUMNS} FROM tareas WHERE id = ?`,
    id
  );
  return row ? mapTarea(row) : null;
}

export async function saveTarea(
  db: SQLiteDatabase,
  input: TareaWrite,
  id?: number
): Promise<number> {
  const creadaEn = new Date().toISOString();
  if (id != null && id > 0) {
    await db.runAsync(
      `UPDATE tareas SET titulo = ?, descripcion = ?, tipo = ?, dias_semana = ?, fecha = ?,
        hora = ?, prioridad = ?
       WHERE id = ?`,
      [
        input.titulo.trim(),
        input.descripcion?.trim() || null,
        input.tipo,
        input.diasSemana.join(','),
        input.fecha,
        input.hora,
        input.prioridad,
        id,
      ]
    );
    // Si la meta pasó a "general" y estaba completada, se reabre: ya no
    // encaja con su nueva recurrencia/fecha.
    if (input.tipo !== 'general') {
      await db.runAsync(
        `UPDATE tareas SET completada = 0, completada_en = NULL WHERE id = ? AND completada = 1`,
        id
      );
    }
    return id;
  }
  const result = await db.runAsync(
    `INSERT INTO tareas (titulo, descripcion, tipo, dias_semana, fecha, hora, prioridad, creada_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.titulo.trim(),
      input.descripcion?.trim() || null,
      input.tipo,
      input.diasSemana.join(','),
      input.fecha,
      input.hora,
      input.prioridad,
      creadaEn,
    ]
  );
  return result.lastInsertRowId;
}

export async function deleteTarea(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM tareas WHERE id = ?', id);
}

// --------------------------------------------------------------- Subtareas

export async function getSubtareas(db: SQLiteDatabase, tareaId: number): Promise<Subtarea[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT id, tarea_id AS tareaId, titulo, hecha, creada_en AS creadaEn FROM subtareas WHERE tarea_id = ? ORDER BY id ASC',
    tareaId
  );
  return rows.map((r) => ({
    id: r.id as number,
    tareaId: r.tareaId as number,
    titulo: r.titulo as string,
    hecha: (r.hecha as number) === 1,
    creadaEn: r.creadaEn as string,
  }));
}

export async function addSubtarea(db: SQLiteDatabase, tareaId: number, titulo: string) {
  await db.runAsync(
    'INSERT INTO subtareas (tarea_id, titulo, creada_en) VALUES (?, ?, ?)',
    [tareaId, titulo.trim(), new Date().toISOString()]
  );
}

export async function toggleSubtarea(db: SQLiteDatabase, id: number) {
  await db.runAsync('UPDATE subtareas SET hecha = 1 - hecha WHERE id = ?', id);
}

export async function deleteSubtarea(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM subtareas WHERE id = ?', id);
}

/** Progreso de subtareas de una tarea: { total, hechas }. */
export async function getSubtaskProgress(
  db: SQLiteDatabase,
  tareaId: number
): Promise<{ total: number; hechas: number }> {
  const row = await db.getFirstAsync<{ total: number; hechas: number }>(
    'SELECT COUNT(*) AS total, COALESCE(SUM(hecha), 0) AS hechas FROM subtareas WHERE tarea_id = ?',
    tareaId
  );
  return { total: row?.total ?? 0, hechas: row?.hechas ?? 0 };
}

// ------------------------------------------------------------- Lógica del día

/** Tareas de una sola vez: las generales y las de día específico. */
export function esDeUnaSolaVez(t: { tipo: TaskType }): boolean {
  return t.tipo === 'general' || t.tipo === 'puntual';
}

/** Días en los que se repite una tarea recurrente (las diarias, todos). */
function diasRecurrencia(t: Tarea): number[] {
  if (t.tipo === 'diaria') return TODOS_LOS_DIAS;
  return t.diasSemana.length > 0 ? t.diasSemana : TODOS_LOS_DIAS;
}

/** Tareas (de una lista) que corresponden a una fecha concreta. */
export function tareasParaFecha(tareas: Tarea[], fechaKey: string): Tarea[] {
  const weekday = weekdayOfKey(fechaKey);
  return tareas.filter((t) => {
    if (t.tipo === 'general') {
      // Las generales solo "viven" el día en que se completaron: ese día
      // salen como hechas, ningún otro (ni pendientes).
      return (
        t.completada &&
        t.completadaEn != null &&
        localDayKey(t.completadaEn) === fechaKey
      );
    }
    if (t.tipo === 'puntual') {
      // Día específico: solo existe en su fecha (hecha o no).
      return t.fecha === fechaKey;
    }
    // Diarias y semanales solo cuentan a partir del día en que se crearon.
    if (localDayKey(t.creadaEn) > fechaKey) return false;
    return diasRecurrencia(t).includes(weekday);
  });
}

async function subtaskMapByTarea(
  db: SQLiteDatabase
): Promise<Map<number, { total: number; hechas: number }>> {
  const rows = await db.getAllAsync<{ tarea_id: number; total: number; hechas: number }>(
    'SELECT tarea_id, COUNT(*) AS total, COALESCE(SUM(hecha), 0) AS hechas FROM subtareas GROUP BY tarea_id'
  );
  return new Map(rows.map((r) => [r.tarea_id, { total: r.total, hechas: r.hechas }]));
}

function buildTareasDelDia(
  due: Tarea[],
  densidadSubtareas: Map<number, { total: number; hechas: number }>,
  hechaEnFecha: (_t: Tarea) => boolean
): TareaDelDia[] {
  return due.map((tarea) => {
    const p = densidadSubtareas.get(tarea.id) ?? { total: 0, hechas: 0 };
    return {
      tarea,
      hecha: hechaEnFecha(tarea),
      subtotal: p.total,
      subhechas: p.hechas,
    };
  });
}

const TIPO_ORDEN = { diaria: 0, semanal: 1, puntual: 2, general: 3 } as const;

/** Orden natural para la lista: tipo, luego las pendientes no hechas, hora, título. */
function sortTareasDelDia(list: TareaDelDia[]) {
  list.sort((a, b) => {
    const base = TIPO_ORDEN[a.tarea.tipo] - TIPO_ORDEN[b.tarea.tipo];
    if (base !== 0) return base;
    if (a.hecha !== b.hecha) return a.hecha ? 1 : -1;
    return (a.tarea.hora ?? '').localeCompare(b.tarea.hora ?? '') ||
      a.tarea.titulo.localeCompare(b.tarea.titulo);
  });
}

export interface DiaBruto {
  pendientes: TareaDelDia[];
  hechas: TareaDelDia[];
  noHechas: TareaDelDia[];
}

/** Lista completa de un día: pendientes, hechas y no hechas (las que se pasaron). */
export async function getDia(db: SQLiteDatabase, fechaKey: string): Promise<DiaBruto> {
  const tareas = await getTareas(db);
  const due = tareasParaFecha(tareas, fechaKey);

  const logroRows = await db.getAllAsync<{ tarea_id: number }>(
    'SELECT tarea_id FROM logros WHERE fecha = ?',
    fechaKey
  );
  const logradoHoy = new Set(logroRows.map((r) => r.tarea_id));
  const densidad = await subtaskMapByTarea(db);

  const items = buildTareasDelDia(
    due,
    densidad,
    (t) => (esDeUnaSolaVez(t) ? t.completada : logradoHoy.has(t.id))
  );

  // Se pasó la fecha y no la hiciste → "No hechas" (rojo con X). Si el día aún
  // no termina (hoy o futuro) y no está hecha, sigue en "Por hacer".
  const pasada = fechaKey < todayKey();
  const hechas = items.filter((i) => i.hecha);
  const noHechas: TareaDelDia[] = [];
  const pendientes: TareaDelDia[] = [];
  for (const i of items) {
    if (i.hecha) continue;
    (pasada ? noHechas : pendientes).push(i);
  }

  sortTareasDelDia(pendientes);
  sortTareasDelDia(noHechas);
  // Las hechas van al final, en orden inverso (las más recientes primero no se
  // pueden saber fácilmente; se dejan ordenadas por tipo/título).
  sortTareasDelDia(hechas);

  return { pendientes, hechas, noHechas };
}

/** ¿Tiene la tarea un logro (hecha) en la fecha indicada? */
export async function getLogro(
  db: SQLiteDatabase,
  tareaId: number,
  fechaKey: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM logros WHERE tarea_id = ? AND fecha = ?',
    [tareaId, fechaKey]
  );
  return !!row;
}

/** Marca o desmarca una tarea en una fecha concreta. */
export async function toggleTareaEnFecha(db: SQLiteDatabase, tareaId: number, fechaKey: string) {
  const tarea = await getTarea(db, tareaId);
  if (!tarea) return;

  if (esDeUnaSolaVez(tarea)) {
    if (tarea.completada) {
      await db.runAsync(
        'UPDATE tareas SET completada = 0, completada_en = NULL WHERE id = ?',
        tareaId
      );
      await db.runAsync('DELETE FROM logros WHERE tarea_id = ? AND fecha = ?', [
        tareaId,
        tarea.fecha ?? fechaKey,
      ]);
    } else {
      const fecha = tarea.fecha ?? fechaKey;
      await db.runAsync(
        'UPDATE tareas SET completada = 1, completada_en = ? WHERE id = ?',
        [new Date().toISOString(), tareaId]
      );
      await db.runAsync(
        'INSERT OR IGNORE INTO logros (tarea_id, fecha, completada_en) VALUES (?, ?, ?)',
        [tareaId, fecha, new Date().toISOString()]
      );
    }
    return;
  }

  const existente = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM logros WHERE tarea_id = ? AND fecha = ?',
    [tareaId, fechaKey]
  );
  if (existente) {
    await db.runAsync('DELETE FROM logros WHERE id = ?', existente.id);
  } else {
    await db.runAsync(
      'INSERT OR IGNORE INTO logros (tarea_id, fecha, completada_en) VALUES (?, ?, ?)',
      [tareaId, fechaKey, new Date().toISOString()]
    );
  }
}

/**
 * Todas las tareas con su estado actual (usado por la pestaña Metas):
 * una recurrente cuenta como "hecha" si ya tiene logro HOY; una general si
 * está marcada como completada. Incluye el progreso de sus subtareas.
 */
export async function getTareasConEstado(db: SQLiteDatabase): Promise<TareaDelDia[]> {
  const tareas = await getTareas(db);
  const hoy = todayKey();
  const logroRows = await db.getAllAsync<{ tarea_id: number }>(
    'SELECT tarea_id FROM logros WHERE fecha = ?',
    hoy
  );
  const logradoHoy = new Set(logroRows.map((r) => r.tarea_id));
  const densidad = await subtaskMapByTarea(db);

  return tareas.map((tarea) => {
    const p = densidad.get(tarea.id) ?? { total: 0, hechas: 0 };
    return {
      tarea,
      hecha: esDeUnaSolaVez(tarea) ? tarea.completada : logradoHoy.has(tarea.id),
      subtotal: p.total,
      subhechas: p.hechas,
    };
  });
}

// -------------------------------------------------------------- Calendario

/** Marcas (por tipo) de los días de un mes. month es 0-based. */
export async function getMarcasMes(
  db: SQLiteDatabase,
  year: number,
  month: number
): Promise<Record<string, MarcaDia>> {
  const tareas = await getTareas(db);
  const diasEnMes = new Date(year, month + 1, 0).getDate();
  const marcas: Record<string, MarcaDia> = {};

  for (let d = 1; d <= diasEnMes; d++) {
    const key = `${year}-${pad2(month + 1)}-${pad2(d)}`;
    const weekday = new Date(year, month, d).getDay();
    const marca: MarcaDia = { diaria: false, semanal: false, puntual: false, general: false };

    for (const t of tareas) {
      if (t.tipo === 'general') {
        if (t.completada && t.completadaEn != null && localDayKey(t.completadaEn) === key) {
          marca.general = true;
        }
      } else if (t.tipo === 'puntual') {
        if (t.fecha === key) marca.puntual = true;
      } else if (localDayKey(t.creadaEn) <= key) {
        // Diarias a partir de su creación; semanales en sus días marcados.
        if (t.tipo === 'diaria') {
          marca.diaria = true;
        } else if (diasRecurrencia(t).includes(weekday)) {
          marca.semanal = true;
        }
      }
    }

    if (marca.diaria || marca.semanal || marca.puntual || marca.general) {
      marcas[key] = marca;
    }
  }
  return marcas;
}

// ------------------------------------------------------------- Estadísticas

/** Racha de días consecutivos con al menos una tarea completada. */
export function calcularRacha(fechasCompletadas: Set<string>, hoy: string): number {
  if (fechasCompletadas.size === 0) return 0;
  let cursor = fechasCompletadas.has(hoy) ? hoy : addDaysToKey(hoy, -1);
  if (!fechasCompletadas.has(cursor)) return 0;
  let racha = 0;
  while (fechasCompletadas.has(cursor)) {
    racha += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return racha;
}

export async function getEstadisticas(db: SQLiteDatabase): Promise<Estadisticas> {
  const tareas = await getTareas(db);
  const hoy = todayKey();

  const logroRows = await db.getAllAsync<Logro>('SELECT * FROM logros');
  const fechasCompletadas = new Set(
    logroRows.map((l) => l.fecha).concat(tareas.filter((t) => t.completadaEn).map((t) => localDayKey(t.completadaEn!)))
  );
  const racha = calcularRacha(fechasCompletadas, hoy);

  const dia = await getDia(db, hoy);

  return {
    total: tareas.length,
    pendientes: tareas.filter((t) => (esDeUnaSolaVez(t) ? !t.completada : true)).length,
    completadasDeUnaVez: tareas.filter((t) => esDeUnaSolaVez(t) && t.completada).length,
    diarias: tareas.filter((t) => t.tipo === 'diaria').length,
    semanales: tareas.filter((t) => t.tipo === 'semanal').length,
    generales: tareas.filter((t) => t.tipo === 'general').length,
    hoyHechas: dia.pendientes.length + dia.hechas.length > 0 ? dia.hechas.length : 0,
    hoyTotal: dia.pendientes.length + dia.hechas.length,
    racha,
  };
}

// -------------------------------------------------- Resumen de estadísticas

export interface RachaDia {
  fecha: string;
  titulos: { titulo: string; tipo: TaskType }[];
}

/** Días de la racha actual con las metas completadas en cada uno. */
export async function getRachaDetalle(
  db: SQLiteDatabase
): Promise<{ racha: number; dias: RachaDia[] }> {
  const tareas = await getTareas(db);
  const porId = new Map(tareas.map((t) => [t.id, t]));
  const logros = await db.getAllAsync<{ tarea_id: number; fecha: string }>(
    'SELECT tarea_id, fecha FROM logros'
  );

  const actividadPorFecha = new Map<string, Set<number>>();
  const addActividad = (fecha: string, tareaId: number) => {
    if (!fecha) return;
    const set = actividadPorFecha.get(fecha) ?? new Set();
    set.add(tareaId);
    actividadPorFecha.set(fecha, set);
  };

  // Recurrentes: el día de su logro. Una sola vez: el día efectivo (completadaEn).
  for (const l of logros) {
    const t = porId.get(l.tarea_id);
    if (t && !esDeUnaSolaVez(t)) addActividad(l.fecha, l.tarea_id);
  }
  for (const t of tareas) {
    if (esDeUnaSolaVez(t) && t.completada && t.completadaEn) {
      addActividad(localDayKey(t.completadaEn), t.id);
    }
  }

  const hoy = todayKey();
  let cursor = actividadPorFecha.has(hoy) ? hoy : addDaysToKey(hoy, -1);
  const dias: RachaDia[] = [];
  while (actividadPorFecha.has(cursor)) {
    const ids = Array.from(actividadPorFecha.get(cursor)!);
    dias.push({
      fecha: cursor,
      titulos: ids
        .map((tid) => porId.get(tid))
        .filter((t): t is Tarea => !!t)
        .map((t) => ({ titulo: t.titulo, tipo: t.tipo })),
    });
    cursor = addDaysToKey(cursor, -1);
  }
  return { racha: dias.length, dias };
}

export interface EstadisticaResumen {
  stats: Estadisticas;
  activas?: Tarea[];
  racha?: { dias: RachaDia[] };
  hechasHoy?: TareaDelDia[];
  cumplidas?: { tarea: Tarea; completadaEl: string }[];
}

/** Todo lo que necesita una pantalla de resumen según la estadística elegida. */
export async function getEstadisticaResumen(
  db: SQLiteDatabase,
  clave: string
): Promise<EstadisticaResumen> {
  const stats = await getEstadisticas(db);
  if (clave === 'racha') {
    return { stats, racha: await getRachaDetalle(db) };
  }
  if (clave === 'hoy') {
    const dia = await getDia(db, todayKey());
    return { stats, hechasHoy: dia.hechas };
  }
  if (clave === 'generales') {
    const cumplidas = (await getTareas(db))
      .filter((t) => esDeUnaSolaVez(t) && t.completada && t.completadaEn != null)
      .map((t) => ({ tarea: t, completadaEl: localDayKey(t.completadaEn!) }));
    return { stats, cumplidas };
  }
  const activas = (await getTareas(db)).filter((t) =>
    esDeUnaSolaVez(t) ? !t.completada : true
  );
  return { stats, activas };
}

// ------------------------------------------------------------------- Ajustes

export const RECORDATORIO_DEFAULT_HORA = '07:00';

export interface RecordatorioConfig {
  activo: boolean;
  hora: string;
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function getRecordatorioConfig(db: SQLiteDatabase): Promise<RecordatorioConfig> {
  const activo = (await getSetting(db, 'recordatorio_activo')) === '1';
  const hora = (await getSetting(db, 'recordatorio_hora')) || RECORDATORIO_DEFAULT_HORA;
  return { activo, hora };
}

export async function setRecordatorioConfig(db: SQLiteDatabase, cfg: RecordatorioConfig) {
  await setSetting(db, 'recordatorio_activo', cfg.activo ? '1' : '0');
  await setSetting(db, 'recordatorio_hora', cfg.hora);
}

/** Borra todo el contenido (tareas, subtareas y logros). */
export async function wipeDatos(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM subtareas;
      DELETE FROM logros;
      DELETE FROM tareas;
      DELETE FROM sqlite_sequence WHERE name IN ('subtareas','logros','tareas');
    `);
  });
}