import { SqlDb } from '../storage/sqlDb';

export interface DocumentVisit {
  id: string;
  visitedAt: number;
}

export async function recordDocumentVisit(db: SqlDb, id: string, visitedAt = Date.now()): Promise<void> {
  await db.runAsync(
    `INSERT INTO document_visits (id, visited_at)
       SELECT id, ? FROM cards WHERE id = ? AND deleted_at IS NULL
       ON CONFLICT(id) DO UPDATE SET visited_at = excluded.visited_at`,
    [visitedAt, id],
  );
}

export function listDocumentVisits(db: SqlDb): Promise<DocumentVisit[]> {
  return db.getAllAsync<DocumentVisit>(
    `SELECT visits.id, visits.visited_at AS visitedAt
       FROM document_visits AS visits JOIN cards ON cards.id = visits.id
       WHERE cards.deleted_at IS NULL ORDER BY visits.visited_at DESC, visits.id`,
    [],
  );
}
