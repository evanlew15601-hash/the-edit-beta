import { isDebugEnabled } from '@/utils/debugEnv';

export type InteractionType =
  | 'conversation'
  | 'dm'
  | 'scheme'
  | 'observation'
  | 'confessional'
  | 'event';

type LogInteractionArgs = {
  day?: number;
  type: InteractionType;
  participants: string[];
  npcName?: string;
  playerName?: string;
  playerMessage: string;
  aiResponse: string;
  tone?: string;
};

type LocalInteractionRow = {
  id: string;
  day: number | null;
  type: InteractionType;
  participants: string[];
  npcName: string | null;
  playerName: string | null;
  playerMessage: string;
  aiResponse: string;
  tone: string | null;
  createdAt: string;
};

const DB_NAME = 'rtv_interactions_db';
const DB_VERSION = 1;
const STORE = 'interactions';

const createId = () => {
  const cryptoAny = (globalThis as any).crypto;
  if (cryptoAny && typeof cryptoAny.randomUUID === 'function') {
    return cryptoAny.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const openDb = async (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') return null;

  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('npcPlayerCreatedAt', ['npcName', 'playerName', 'createdAt']);
        store.createIndex('createdAt', 'createdAt');
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// Local interaction persistence (IndexedDB). This replaces Supabase for gameplay + debugging.
export async function logInteractionToCloud(args: LogInteractionArgs): Promise<void> {
  const {
    day,
    type,
    participants,
    npcName,
    playerName,
    playerMessage,
    aiResponse,
    tone,
  } = args;

  const db = await openDb();
  if (!db) return;

  const row: LocalInteractionRow = {
    id: createId(),
    day: typeof day === 'number' ? day : null,
    type,
    participants,
    npcName: npcName ?? null,
    playerName: playerName ?? null,
    playerMessage,
    aiResponse,
    tone: tone ?? null,
    createdAt: new Date().toISOString(),
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(row);
    });
  } catch (e) {
    if (isDebugEnabled()) {
      console.warn('Error logging interaction locally:', e);
    }
  } finally {
    db.close();
  }
}

export async function fetchRecentInteractions(args: {
  npcName: string;
  playerName: string;
  limit?: number;
}): Promise<
  {
    playerMessage: string;
    aiResponse: string;
    createdAt: string;
    type: InteractionType;
  }[]
> {
  const { npcName, playerName, limit = 10 } = args;

  const db = await openDb();
  if (!db) return [];

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const index = store.index('npcPlayerCreatedAt');

      const lower = [npcName, playerName, ''];
      const upper = [npcName, playerName, '\uffff'];
      const range = IDBKeyRange.bound(lower, upper);

      const results: LocalInteractionRow[] = [];
      const req = index.openCursor(range, 'prev');

      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(results);
          return;
        }

        results.push(cursor.value as LocalInteractionRow);

        if (results.length >= limit) {
          resolve(results);
          return;
        }

        cursor.continue();
      };

      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    }).then((rows: LocalInteractionRow[]) =>
      rows.map((row) => ({
        playerMessage: row.playerMessage || '',
        aiResponse: row.aiResponse || '',
        createdAt: row.createdAt || '',
        type: row.type,
      }))
    );
  } catch (e) {
    if (isDebugEnabled()) {
      console.warn('Error fetching local interactions:', e);
    }
    return [];
  } finally {
    db.close();
  }
}

export async function fetchLatestInteractions(args?: { limit?: number }): Promise<LocalInteractionRow[]> {
  const limit = args?.limit ?? 200;

  const db = await openDb();
  if (!db) return [];

  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const index = store.index('createdAt');

      const results: LocalInteractionRow[] = [];
      const req = index.openCursor(null, 'prev');

      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(results);
          return;
        }

        results.push(cursor.value as LocalInteractionRow);

        if (results.length >= limit) {
          resolve(results);
          return;
        }

        cursor.continue();
      };

      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    if (isDebugEnabled()) {
      console.warn('Error fetching latest local interactions:', e);
    }
    return [];
  } finally {
    db.close();
  }
}

export async function clearLocalInteractions(): Promise<void> {
  const db = await openDb();
  if (!db) return;

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).clear();
    });
  } catch (e) {
    if (isDebugEnabled()) {
      console.warn('Error clearing local interactions:', e);
    }
  } finally {
    db.close();
  }
}