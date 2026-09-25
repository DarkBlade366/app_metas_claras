import type { SQLiteDatabase } from 'expo-sqlite';

import { addDaysToKey, getSetting, setSetting, todayKey } from './db';
import type { Issue, IssueEstado, Priority, Proyecto, ProyectoEstado } from './schema';

export type { Issue, IssueEstado, Proyecto };

export interface ProyectoWrite {
  nombre: string;
  descripcion: string | null;
  prioridad: Priority;
}

export interface IssueWrite {
  proyectoId: number;
  titulo: string;
  descripcion: string | null;
  prioridad: Priority;
  fechaPlaneada: string | null;
}

export interface ProyectoConStats extends Proyecto {
  abiertos: number;
  hoy: number;
  vencidos: number;
}

export interface ResumenProyecto {
  abiertos: number;
  resueltos: number;
  cancelados: number;
  hoy: number;
  vencidos: number;
}

function mapProyecto(row: Record<string, unknown>): Proyecto {
  return {
    id: row.id as number,
    nombre: row.nombre as string,
    descripcion: (row.descripcion as string | null) ?? null,
    prioridad: (row.prioridad as Priority) ?? 'media',
    estado: (row.estado as ProyectoEstado) ?? 'activo',
    posicion: row.posicion as number,
    creadaEn: (row.creadaEn as string) ?? '',
  };
}

function mapIssue(row: Record<string, unknown>): Issue {
  return {
    id: row.id as number,
    proyectoId: row.proyectoId as number,
    titulo: row.titulo as string,
    descripcion: (row.descripcion as string | null) ?? null,
    prioridad: (row.prioridad as Priority) ?? 'media',
    estado: (row.estado as IssueEstado) ?? 'abierto',
    fechaPlaneada: (row.fechaPlaneada as string | null) ?? null,
    resueltoEn: (row.resueltoEn as string | null) ?? null,
    creadaEn: (row.creadaEn as string) ?? '',
  };
}

const PROYECTO_COLUMNS = `
  id, nombre, descripcion, prioridad, estado, posicion, creada_en AS creadaEn`;
const ISSUE_COLUMNS = `
  id, proyecto_id AS proyectoId, titulo, descripcion, prioridad, estado,
  fecha_planeada AS fechaPlaneada, resuelto_en AS resueltoEn, creada_en AS creadaEn`;

// ------------------------------------------------------------- Proyectos CRUD

export async function getProyectos(db: SQLiteDatabase): Promise<Proyecto[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${PROYECTO_COLUMNS} FROM proyectos ORDER BY estado ASC, posicion ASC, nombre COLLATE NOCASE ASC`
  );
  return rows.map(mapProyecto);
}

/** Solo proyectos activos (los que aún están en marcha). */
export async function getProyectosActivos(db: SQLiteDatabase): Promise<Proyecto[]> {
  const todos = await getProyectos(db);
  return todos.filter((p) => p.estado === 'activo');
}

/** TRUE si un proyecto (recibido por id, null si no existe) está activo. */
export async function esProyectoActivo(db: SQLiteDatabase, id: number): Promise<boolean> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT estado FROM proyectos WHERE id = ?',
    id
  );
  return (row?.estado as ProyectoEstado) === 'activo';
}

export async function setProyectoEstado(
  db: SQLiteDatabase,
  id: number,
  estado: ProyectoEstado
) {
  await db.runAsync('UPDATE proyectos SET estado = ? WHERE id = ?', [estado, id]);
}

/**
 * Cambio de estado con reglas de negocio:
 * - cancelar: todos los issues abiertos pasan a cancelado.
 * - completar: solo si no queda ningún issue abierto (todos resueltos/cancelados).
 * Devuelve false + mensaje si la transición no se puede aplicar.
 */
export async function cambiarEstadoProyecto(
  db: SQLiteDatabase,
  id: number,
  estado: ProyectoEstado
): Promise<{ ok: boolean; mensaje?: string }> {
  if (estado === 'completado') {
    const issues = await getIssues(db, id);
    const abiertos = issues.filter((i) => i.estado === 'abierto').length;
    if (abiertos > 0) {
      return {
        ok: false,
        mensaje: `Para completar, todos los issues deben estar resueltos o cancelados. Te quedan ${abiertos} ${abiertos === 1 ? 'issue' : 'issues'} abiertos.`,
      };
    }
  }

  await setProyectoEstado(db, id, estado);

  if (estado === 'cancelado') {
    await db.runAsync(
      `UPDATE issues SET estado = 'cancelado', resuelto_en = ? WHERE proyecto_id = ? AND estado = 'abierto'`,
      [new Date().toISOString(), id]
    );
  }

  return { ok: true };
}

export async function getProyecto(db: SQLiteDatabase, id: number): Promise<Proyecto | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PROYECTO_COLUMNS} FROM proyectos WHERE id = ?`,
    id
  );
  return row ? mapProyecto(row) : null;
}

export async function saveProyecto(
  db: SQLiteDatabase,
  input: ProyectoWrite,
  id?: number
): Promise<number> {
  if (id != null && id > 0) {
    await db.runAsync(
      `UPDATE proyectos SET nombre = ?, descripcion = ?, prioridad = ? WHERE id = ?`,
      [input.nombre.trim(), input.descripcion?.trim() || null, input.prioridad, id]
    );
    return id;
  }
  const creadaEn = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO proyectos (nombre, descripcion, prioridad, creada_en) VALUES (?, ?, ?, ?)`,
    [input.nombre.trim(), input.descripcion?.trim() || null, input.prioridad, creadaEn]
  );
  return result.lastInsertRowId;
}

export async function deleteProyecto(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM proyectos WHERE id = ?', id);
}

// ---------------------------------------------------------------- Issues CRUD

/** Issues de la BD; con proyectoId se filtran los de ese proyecto. */
export async function getIssues(
  db: SQLiteDatabase,
  proyectoId?: number
): Promise<Issue[]> {
  const rows =
    proyectoId == null
      ? await db.getAllAsync<Record<string, unknown>>(
          `SELECT ${ISSUE_COLUMNS} FROM issues ORDER BY fecha_planeada ASC, id ASC`
        )
      : await db.getAllAsync<Record<string, unknown>>(
          `SELECT ${ISSUE_COLUMNS} FROM issues WHERE proyecto_id = ? ORDER BY fecha_planeada ASC, id ASC`,
          proyectoId
        );
  return rows.map(mapIssue);
}

export async function getIssue(db: SQLiteDatabase, id: number): Promise<Issue | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${ISSUE_COLUMNS} FROM issues WHERE id = ?`,
    id
  );
  return row ? mapIssue(row) : null;
}

export async function saveIssue(db: SQLiteDatabase, input: IssueWrite, id?: number) {
  if (id != null && id > 0) {
    await db.runAsync(
      `UPDATE issues SET titulo = ?, descripcion = ?, prioridad = ?, fecha_planeada = ? WHERE id = ?`,
      [
        input.titulo.trim(),
        input.descripcion?.trim() || null,
        input.prioridad,
        input.fechaPlaneada,
        id,
      ]
    );
    // Si ya estaba cerrado (resuelto/cancelado), al editarlo se reabre y se limpia su cierre.
    await db.runAsync(
      `UPDATE issues SET estado = 'abierto', resuelto_en = NULL WHERE id = ? AND estado IN ('resuelto', 'cancelado')`,
      id
    );
    return id;
  }
  const creadaEn = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO issues (proyecto_id, titulo, descripcion, prioridad, fecha_planeada, creada_en)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.proyectoId,
      input.titulo.trim(),
      input.descripcion?.trim() || null,
      input.prioridad,
      input.fechaPlaneada,
      creadaEn,
    ]
  );
  return result.lastInsertRowId;
}

/** Marca un issue como resuelto (o lo reabre). usaFecha: si ya estaba resuelto se reabre. */
export async function setIssueResuelto(db: SQLiteDatabase, id: number, resuelto: boolean) {
  if (resuelto) {
    await db.runAsync(
      `UPDATE issues SET estado = 'resuelto', resuelto_en = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  } else {
    await db.runAsync(
      `UPDATE issues SET estado = 'abierto', resuelto_en = NULL WHERE id = ?`,
      id
    );
  }
}

export async function toggleIssueResuelto(db: SQLiteDatabase, id: number) {
  const issue = await getIssue(db, id);
  if (!issue) return;
  await setIssueResuelto(db, id, issue.estado === 'abierto');
}

export async function deleteIssue(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM issues WHERE id = ?', id);
}

// -------------------------------------------------------------- Vistas / stats

/** Issues de proyectos ACTIVOS: los de proyectos cerrados no cuentan. */
export async function getIssuesActivos(db: SQLiteDatabase): Promise<Issue[]> {
  const [issues, activos] = await Promise.all([getIssues(db), getProyectosActivos(db)]);
  const ids = new Set(activos.map((p) => p.id));
  return issues.filter((i) => ids.has(i.proyectoId));
}

/** Proyectos con contadores de sus issues abiertos (hoy/vencidos). */
export async function getProyectosConStats(db: SQLiteDatabase): Promise<ProyectoConStats[]> {
  const proyectos = await getProyectos(db);
  const issues = await getIssuesActivos(db);
  const hoy = todayKey();

  return proyectos.map((p) => {
    const propios = issues.filter((i) => i.proyectoId === p.id && i.estado === 'abierto');
    return {
      ...p,
      abiertos: propios.length,
      hoy: propios.filter((i) => i.fechaPlaneada === hoy).length,
      vencidos: propios.filter(
        (i) => i.fechaPlaneada != null && i.fechaPlaneada < hoy
      ).length,
    };
  });
}

export async function getResumenProyecto(
  db: SQLiteDatabase,
  proyectoId: number
): Promise<ResumenProyecto> {
  const issues = await getIssues(db, proyectoId);
  const hoy = todayKey();
  const abiertos = issues.filter((i) => i.estado === 'abierto');
  return {
    abiertos: abiertos.length,
    resueltos: issues.filter((i) => i.estado === 'resuelto').length,
    cancelados: issues.filter((i) => i.estado === 'cancelado').length,
    hoy: abiertos.filter((i) => i.fechaPlaneada === hoy).length,
    vencidos: abiertos.filter(
      (i) => i.fechaPlaneada != null && i.fechaPlaneada < hoy
    ).length,
  };
}

export interface GrupoIssue {
  clave: 'vencidos' | 'hoy' | 'manana' | 'proximos' | 'sinFecha' | 'resueltos' | 'cancelados';
  titulo: string;
  issues: Issue[];
}

function ordenarPorFecha(lista: Issue[]): Issue[] {
  return [...lista].sort(
    (a, b) =>
      (a.fechaPlaneada ?? '9999-99-99').localeCompare(b.fechaPlaneada ?? '9999-99-99') ||
      a.titulo.localeCompare(b.titulo)
  );
}

/** Agrupa issues para la vista del proyecto por cuándo toca resolverlos. */
export function agruparIssues(issues: Issue[], hoy: string): GrupoIssue[] {
  const manana = addDaysToKey(hoy, 1);
  const abiertos = issues.filter((i) => i.estado === 'abierto');
  const resueltos = issues.filter((i) => i.estado === 'resuelto');
  const cancelados = issues.filter((i) => i.estado === 'cancelado');

  const grupos: GrupoIssue[] = [];
  const vencidos = abiertos.filter(
    (i) => i.fechaPlaneada != null && i.fechaPlaneada < hoy
  );
  if (vencidos.length > 0) grupos.push({ clave: 'vencidos', titulo: 'Vencidos sin resolver', issues: ordenarPorFecha(vencidos) });
  const hoyList = abiertos.filter((i) => i.fechaPlaneada === hoy);
  if (hoyList.length > 0) grupos.push({ clave: 'hoy', titulo: 'Para hoy', issues: ordenarPorFecha(hoyList) });
  const mananaList = abiertos.filter((i) => i.fechaPlaneada === manana);
  if (mananaList.length > 0) grupos.push({ clave: 'manana', titulo: 'Para mañana', issues: ordenarPorFecha(mananaList) });
  const proximos = abiertos.filter(
    (i) => i.fechaPlaneada != null && i.fechaPlaneada > manana
  );
  if (proximos.length > 0) grupos.push({ clave: 'proximos', titulo: 'Próximos', issues: ordenarPorFecha(proximos) });
  const sinFecha = abiertos.filter((i) => i.fechaPlaneada == null);
  if (sinFecha.length > 0) grupos.push({ clave: 'sinFecha', titulo: 'Sin fecha', issues: ordenarPorFecha(sinFecha) });
  if (resueltos.length > 0) grupos.push({ clave: 'resueltos', titulo: 'Resueltos', issues: ordenarPorFecha(resueltos) });
  if (cancelados.length > 0) grupos.push({ clave: 'cancelados', titulo: 'Cancelados', issues: ordenarPorFecha(cancelados) });

  return grupos;
}

/** ¿Vencido (abierto y con fecha anterior a hoy)? Para destacar en la UI. */
export function esVencido(issue: Issue, hoy: string): boolean {
  return (
    issue.estado === 'abierto' &&
    issue.fechaPlaneada != null &&
    issue.fechaPlaneada < hoy
  );
}

// ----------------------------------------------------------- Métricas globales

export type FiltroIssue = 'abiertos' | 'hoy' | 'manana' | 'vencidos' | 'resueltos';

export interface MetricasProyectos {
  totalProyectos: number;
  proyectosConIssues: number;
  abiertos: number;
  hoy: number;
  manana: number;
  vencidos: number;
  resueltos: number;
}

/** Cuentas globales de todos los proyectos (para la pantalla de métricas). */
export async function getMetricasProyectos(db: SQLiteDatabase): Promise<MetricasProyectos> {
  const [todos, activos] = await Promise.all([getIssuesActivos(db), getProyectosActivos(db)]);
  const proyectoIds = new Set(activos.map((p) => p.id));
  const hoy = todayKey();
  const manana = addDaysToKey(hoy, 1);
  const abiertos = todos.filter((i) => i.estado === 'abierto');
  return {
    totalProyectos: proyectoIds.size,
    proyectosConIssues: new Set(todos.map((i) => i.proyectoId)).size,
    abiertos: abiertos.length,
    hoy: abiertos.filter((i) => i.fechaPlaneada === hoy).length,
    manana: abiertos.filter((i) => i.fechaPlaneada === manana).length,
    vencidos: abiertos.filter(
      (i) => i.fechaPlaneada != null && i.fechaPlaneada < hoy
    ).length,
    resueltos: todos.filter((i) => i.estado === 'resuelto').length,
  };
}

export interface IssueConProyecto {
  issue: Issue;
  proyecto: Proyecto | null;
}

function filtroDeClave(clave: FiltroIssue, hoy: string, manana: string) {
  switch (clave) {
    case 'resueltos':
      return (i: Issue) => i.estado === 'resuelto';
    case 'hoy':
      return (i: Issue) => i.estado === 'abierto' && i.fechaPlaneada === hoy;
    case 'manana':
      return (i: Issue) => i.estado === 'abierto' && i.fechaPlaneada === manana;
    case 'vencidos':
      return (i: Issue) =>
        i.estado === 'abierto' && i.fechaPlaneada != null && i.fechaPlaneada < hoy;
    default:
      return (i: Issue) => i.estado === 'abierto';
  }
}

/** Issues que cumplen un filtro global, opcionalmente de un solo proyecto. */
export async function getIssuesFiltrados(
  db: SQLiteDatabase,
  clave: FiltroIssue,
  proyectoId?: number
): Promise<IssueConProyecto[]> {
  const [todos, proyectos] = await Promise.all([getIssues(db, proyectoId), getProyectos(db)]);
  // Vista global: solo cuentan los proyectos activos. Desde el detalle de un
  // proyecto (proyectoId) se ven sus issues aunque esté cerrado.
  const activos = new Set(
    proyectoId == null ? proyectos.filter((p) => p.estado === 'activo').map((p) => p.id) : []
  );
  const fuente = proyectoId == null ? todos.filter((i) => activos.has(i.proyectoId)) : todos;
  const hoy = todayKey();
  const manana = addDaysToKey(hoy, 1);
  const filtrados = fuente
    .filter(filtroDeClave(clave, hoy, manana))
    .sort(
      (a, b) =>
        (a.fechaPlaneada ?? '9999-99-99').localeCompare(b.fechaPlaneada ?? '9999-99-99') ||
        a.titulo.localeCompare(b.titulo)
    );
  const porId = new Map(proyectos.map((p) => [p.id, p]));
  return filtrados.map((issue) => ({ issue, proyecto: porId.get(issue.proyectoId) ?? null }));
}

// --------------------------------------------------- Recordatorios de issues

export interface IssuesRecordatorioConfig {
  activo: boolean;
  /** Horas del día (HH:mm) en las que recordar si quedan issues sin resolver. */
  horas: string[];
}

export async function getIssuesRecordatorioConfig(db: SQLiteDatabase): Promise<IssuesRecordatorioConfig> {
  const activo = (await getSetting(db, 'issues_reminder_activo')) === '1';
  const raw = (await getSetting(db, 'issues_reminder_horas')) || '';
  const horas = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d{2}:\d{2}$/.test(s))
    .sort();
  return { activo, horas };
}

export async function setIssuesRecordatorioConfig(
  db: SQLiteDatabase,
  cfg: IssuesRecordatorioConfig
) {
  await setSetting(db, 'issues_reminder_activo', cfg.activo ? '1' : '0');
  const horas = [...new Set(cfg.horas.filter((h) => /^\d{2}:\d{2}$/.test(h)))].sort();
  await setSetting(db, 'issues_reminder_horas', horas.join(','));
}