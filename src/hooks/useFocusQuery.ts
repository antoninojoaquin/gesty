import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import type { Db } from '@/db/types';

type FocusQuery<T> = {
  /** undefined until the first load finishes. */
  data: T | undefined;
  error: Error | undefined;
  reload: () => Promise<void>;
};

/**
 * Runs `query` against the database every time the screen gains focus, and on `reload()`
 * (call it after a mutation). Results from an outdated run are ignored.
 */
export function useFocusQuery<T>(query: (db: Db) => Promise<T>): FocusQuery<T> {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const queryRef = useRef(query);
  queryRef.current = query;
  const runId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++runId.current;
    try {
      const result = await queryRef.current(db);
      if (id === runId.current) {
        setData(result);
        setError(undefined);
      }
    } catch (e) {
      if (id === runId.current) setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { data, error, reload };
}
