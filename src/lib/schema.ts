import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'metasclaras.db';
export const DB_VERSION = 5;

export type TaskType = 'diaria' | 'semanal' | 'puntual' | 'general';
export type Priority = 'alta' | 'media' | 'baja';
export type IssueEstado = 'abierto' | 'resuelto' | 'cancelado';
export type ProyectoEstado = 'activo' | 'completado' | 'cancelado';

/** Tarea (meta). */
export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string | null;
  /** diaria | semanal | puntual | general */
  tipo: TaskType;
  /** Días de la semana (0=domingo … 6=sábado). Solo diaria/semanal. */
  diasSemana: number[];
  /** Fecha YYYY-MM-DD. Obligatoria en puntual, opcional en general. */
  fecha: string | null;
  /** Hora HH:mm (opcional en cualquier tipo). */
  hora: string | null;
  prioridad: Priority;
  color: string;
  /** Solo general: se completa una sola vez. */
  completada: boolean;
  completadaEn: string | null;
  creadaEn: string;
  posicion: number;
}

export interface Subtarea {
  id: number;
  tareaId: number;
  titulo: string;
  hecha: boolean;
  creadaEn: string;
}

/** Registro de "hecha" de una tarea recurrente en una fecha concreta. */
export interface Logro {
  id: number;
  tareaId: number;
  fecha: string;
  completadaEn: string;
}

/** Proyecto contenedor de issues (pestaña Proyectos). */
export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string | null;
  prioridad: Priority;
  /** activo | completado | cancelado */
  estado: ProyectoEstado;
  posicion: number;
  creadaEn: string;
}

/** Issue de un proyecto: algo a resolver, con fecha planeada. */
export interface Issue {
  id: number;
  proyectoId: number;
  titulo: string;
  descripcion: string | null;
  prioridad: Priority;
  /** abierto | resuelto */
  estado: IssueEstado;
  /** Fecha YYYY-MM-DD en la que piensas resolverlo (normalmente hoy/mañana). */
  fechaPlaneada: string | null;
  resueltoEn: string | null;
  creadaEn: string;
}

/** Etiquetas cortas de los días (domingo primero, como el calendario local). */
export const DIAS_SEMANA_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const DIAS_SEMANA_NOMBRES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
export const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6];

const createV1 = async (db: SQLiteDatabase) => {
  await db.execAsync(`
PRAGMA journal_mode = 'wal';
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tareas (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL,
  dias_semana TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
  fecha TEXT,
  hora TEXT,
  prioridad TEXT NOT NULL DEFAULT 'media',
  color TEXT NOT NULL DEFAULT '#B39DFF',
  completada INTEGER NOT NULL DEFAULT 0,
  completada_en TEXT,
  creada_en TEXT NOT NULL,
  posicion INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tareas_tipo ON tareas (tipo);

CREATE TABLE IF NOT EXISTS subtareas (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  tarea_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  hecha INTEGER NOT NULL DEFAULT 0,
  creada_en TEXT NOT NULL,
  FOREIGN KEY (tarea_id) REFERENCES tareas (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subtareas_tarea ON subtareas (tarea_id);

CREATE TABLE IF NOT EXISTS logros (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  tarea_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  completada_en TEXT NOT NULL,
  FOREIGN KEY (tarea_id) REFERENCES tareas (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_logros_unico ON logros (tarea_id, fecha);
`);
};

const createV2 = async (db: SQLiteDatabase) => {
  await db.execAsync(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`);
};

const createV3 = async (db: SQLiteDatabase) => {
  await db.execAsync(`
CREATE TABLE IF NOT EXISTS proyectos (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  color TEXT NOT NULL DEFAULT '#B39DFF',
  posicion INTEGER NOT NULL DEFAULT 0,
  creada_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_proyectos_nombre ON proyectos (nombre);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  proyecto_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad TEXT NOT NULL DEFAULT 'media',
  estado TEXT NOT NULL DEFAULT 'abierto',
  fecha_planeada TEXT,
  resuelto_en TEXT,
  creada_en TEXT NOT NULL,
  FOREIGN KEY (proyecto_id) REFERENCES proyectos (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_issues_proyecto ON issues (proyecto_id);
CREATE INDEX IF NOT EXISTS idx_issues_fecha ON issues (fecha_planeada);
`);
};

const createV4 = async (db: SQLiteDatabase) => {
  await db.execAsync(`
ALTER TABLE proyectos ADD COLUMN prioridad TEXT NOT NULL DEFAULT 'media';
`);
};

const createV5 = async (db: SQLiteDatabase) => {
  await db.execAsync(`
ALTER TABLE proyectos ADD COLUMN estado TEXT NOT NULL DEFAULT 'activo';
`);
};

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentDbVersion = versionRow?.user_version ?? 0;

  if (currentDbVersion >= DB_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await createV1(db);
    await db.execAsync(`PRAGMA user_version = 1`);
  }

  if (currentDbVersion <= 1) {
    await createV2(db);
    await db.execAsync(`PRAGMA user_version = 2`);
  }

  if (currentDbVersion <= 2) {
    await createV3(db);
    await db.execAsync(`PRAGMA user_version = 3`);
  }

  if (currentDbVersion <= 3) {
    await createV4(db);
    await db.execAsync(`PRAGMA user_version = 4`);
  }

  if (currentDbVersion <= 4) {
    await createV5(db);
    await db.execAsync(`PRAGMA user_version = 5`);
  }
}