import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import { DATABASE_NAME, migrateDbIfNeeded } from './schema';

const useDataVersionStore = create<{ version: number; increment: () => void }>((set) => ({
  version: 0,
  increment: () => set((s) => ({ version: s.version + 1 })),
}));

/** Salta la versión de los datos: refresca cualquier useDbQuery activo. */
export function dataChanged() {
  useDataVersionStore.getState().increment();
}

/** Versión actual de los datos (para reaccionar a cambios). */
export function useDataVersion(): number {
  return useDataVersionStore((s) => s.version);
}

export function useDB(): SQLiteDatabase {
  return useSQLiteContext();
}

export function DBProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      {children}
    </SQLiteProvider>
  );
}

/**
 * Ejecuta el query cuando el dato cambia (dataChanged()) y permite recargar
 * manualmente con reload() (por ejemplo al volver a la pantalla).
 */
export function useDbQuery<T>(queryFn: () => Promise<T>, deps: unknown[] = []) {
  const version = useDataVersionStore((s) => s.version);
  const [state, setState] = useState<{ data: T | null; error: string | null }>({
    data: null,
    error: null,
  });
  const [nonce, setNonce] = useState(0);
  const disposed = useRef(false);

  useEffect(() => {
    disposed.current = false;
    queryFn()
      .then((data) => {
        if (!disposed.current) setState({ data, error: null });
      })
      .catch((err) => {
        if (!disposed.current) {
          setState({ data: null, error: err instanceof Error ? err.message : String(err) });
        }
      });
    return () => {
      disposed.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data: state.data, error: state.error, reload };
}