import { ensureAuthAndSyncSchema } from "./auth";
import { getDatabase } from "./db";

export interface SyncHistoryPayload {
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  vod_remarks?: string;
  episode_name: string;
  episode_index: number;
  source_index: number;
  current_time: number;
  duration: number;
  updated_at: number;
  deleted?: boolean;
}

export interface SyncFavoritePayload {
  vod_id: string;
  vod_name: string;
  vod_pic: string;
  vod_remarks?: string;
  vod_score?: string;
  type_name?: string;
  vod_year?: string;
  updated_at: number;
  deleted?: boolean;
}

export interface SyncSettingPayload {
  key: string;
  value: string;
  updated_at: number;
}

export interface SyncPushRequest {
  history?: SyncHistoryPayload[];
  favorites?: SyncFavoritePayload[];
  settings?: SyncSettingPayload[];
}

export interface SyncPullResponse {
  cursor: number;
  history: SyncHistoryPayload[];
  favorites: SyncFavoritePayload[];
  settings: SyncSettingPayload[];
}

function nextUserSyncSeq(userId: string): number {
  const db = getDatabase();
  const now = Date.now();
  const existing = db
    .prepare(`SELECT cursor_seq FROM sync_cursor WHERE user_id = ?`)
    .get(userId) as { cursor_seq?: number } | undefined;

  const nextSeq = (existing?.cursor_seq ?? 0) + 1;
  db.prepare(
    `INSERT INTO sync_cursor (user_id, cursor_seq, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       cursor_seq = excluded.cursor_seq,
       updated_at = excluded.updated_at`,
  ).run(userId, nextSeq, now);

  return nextSeq;
}

export function getCurrentUserSyncCursor(userId: string): number {
  ensureAuthAndSyncSchema();
  const db = getDatabase();
  const row = db
    .prepare(`SELECT cursor_seq FROM sync_cursor WHERE user_id = ?`)
    .get(userId) as { cursor_seq?: number } | undefined;
  return row?.cursor_seq ?? 0;
}

export function pushUserSyncData(
  userId: string,
  payload: SyncPushRequest,
): { cursor: number; applied: number } {
  ensureAuthAndSyncSchema();
  const db = getDatabase();

  const historyList = Array.isArray(payload.history) ? payload.history : [];
  const favoritesList = Array.isArray(payload.favorites) ? payload.favorites : [];
  const settingsList = Array.isArray(payload.settings) ? payload.settings : [];

  if (
    historyList.length === 0 &&
    favoritesList.length === 0 &&
    settingsList.length === 0
  ) {
    return { cursor: getCurrentUserSyncCursor(userId), applied: 0 };
  }

  let applied = 0;
  let seq = getCurrentUserSyncCursor(userId);
  let inTx = false;

  try {
    db.exec("BEGIN IMMEDIATE TRANSACTION;");
    inTx = true;
    seq = nextUserSyncSeq(userId);

    const selectHistStmt = db.prepare(
      `SELECT episode_index, source_index, current_time, duration, updated_at, deleted
       FROM user_history WHERE user_id = ? AND vod_id = ?`,
    );
    const upsertHistStmt = db.prepare(
      `INSERT INTO user_history (
         user_id, vod_id, vod_name, vod_pic, vod_remarks,
         episode_name, episode_index, source_index, current_time, duration,
         updated_at, deleted, sync_seq
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, vod_id) DO UPDATE SET
         vod_name = excluded.vod_name,
         vod_pic = excluded.vod_pic,
         vod_remarks = excluded.vod_remarks,
         episode_name = excluded.episode_name,
         episode_index = excluded.episode_index,
         source_index = excluded.source_index,
         current_time = excluded.current_time,
         duration = excluded.duration,
         updated_at = excluded.updated_at,
         deleted = excluded.deleted,
         sync_seq = excluded.sync_seq`,
    );

    for (const item of historyList) {
      if (!item || !item.vod_id) continue;
      const incomingUpdatedAt = Number(item.updated_at || Date.now());
      const incomingDeleted = item.deleted ? 1 : 0;

      const existing = selectHistStmt.get(userId, String(item.vod_id)) as
        | {
            episode_index: number;
            source_index: number;
            current_time: number;
            duration: number;
            updated_at: number;
            deleted: number;
          }
        | undefined;

      if (existing && existing.updated_at > incomingUpdatedAt) {
        continue;
      }

      let finalCurrentTime = Number(item.current_time || 0);
      let finalDuration = Number(item.duration || 0);

      // Preserve non-regressing playback progress when on the same episode within 60s
      if (
        existing &&
        !existing.deleted &&
        !incomingDeleted &&
        existing.source_index === Number(item.source_index || 0) &&
        existing.episode_index === Number(item.episode_index || 0) &&
        Math.abs(incomingUpdatedAt - existing.updated_at) <= 60_000
      ) {
        finalCurrentTime = Math.max(finalCurrentTime, existing.current_time);
        finalDuration = Math.max(finalDuration, existing.duration);
      }

      upsertHistStmt.run(
        userId,
        String(item.vod_id),
        String(item.vod_name || ""),
        String(item.vod_pic || ""),
        String(item.vod_remarks || ""),
        String(item.episode_name || ""),
        Number(item.episode_index || 0),
        Number(item.source_index || 0),
        finalCurrentTime,
        finalDuration,
        incomingUpdatedAt,
        incomingDeleted,
        seq,
      );
      applied++;
    }

    const selectFavStmt = db.prepare(
      `SELECT updated_at FROM user_favorites WHERE user_id = ? AND vod_id = ?`,
    );
    const upsertFavStmt = db.prepare(
      `INSERT INTO user_favorites (
         user_id, vod_id, vod_name, vod_pic, vod_remarks,
         vod_score, type_name, vod_year, updated_at, deleted, sync_seq
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, vod_id) DO UPDATE SET
         vod_name = excluded.vod_name,
         vod_pic = excluded.vod_pic,
         vod_remarks = excluded.vod_remarks,
         vod_score = excluded.vod_score,
         type_name = excluded.type_name,
         vod_year = excluded.vod_year,
         updated_at = excluded.updated_at,
         deleted = excluded.deleted,
         sync_seq = excluded.sync_seq`,
    );

    for (const fav of favoritesList) {
      if (!fav || !fav.vod_id) continue;
      const incomingUpdatedAt = Number(fav.updated_at || Date.now());
      const existing = selectFavStmt.get(userId, String(fav.vod_id)) as
        | { updated_at: number }
        | undefined;

      if (existing && existing.updated_at > incomingUpdatedAt) {
        continue;
      }

      upsertFavStmt.run(
        userId,
        String(fav.vod_id),
        String(fav.vod_name || ""),
        String(fav.vod_pic || ""),
        String(fav.vod_remarks || ""),
        String(fav.vod_score || ""),
        String(fav.type_name || ""),
        String(fav.vod_year || ""),
        incomingUpdatedAt,
        fav.deleted ? 1 : 0,
        seq,
      );
      applied++;
    }

    const selectSetStmt = db.prepare(
      `SELECT updated_at FROM user_settings WHERE user_id = ? AND setting_key = ?`,
    );
    const upsertSetStmt = db.prepare(
      `INSERT INTO user_settings (
         user_id, setting_key, setting_value, updated_at, sync_seq
       ) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_at = excluded.updated_at,
         sync_seq = excluded.sync_seq`,
    );

    for (const s of settingsList) {
      if (!s || !s.key) continue;
      const incomingUpdatedAt = Number(s.updated_at || Date.now());
      const existing = selectSetStmt.get(userId, String(s.key)) as
        | { updated_at: number }
        | undefined;

      if (existing && existing.updated_at > incomingUpdatedAt) {
        continue;
      }

      upsertSetStmt.run(
        userId,
        String(s.key),
        String(s.value ?? ""),
        incomingUpdatedAt,
        seq,
      );
      applied++;
    }

    db.exec("COMMIT;");
    inTx = false;
  } catch (err) {
    if (inTx) {
      try {
        db.exec("ROLLBACK;");
      } catch {}
    }
    throw err;
  }

  return { cursor: seq, applied };
}

export function pullUserSyncData(
  userId: string,
  sinceCursor: number,
): SyncPullResponse {
  ensureAuthAndSyncSchema();
  const db = getDatabase();
  const safeSince = Number.isFinite(sinceCursor) && sinceCursor > 0 ? sinceCursor : 0;

  const cursor = getCurrentUserSyncCursor(userId);

  const histRows = db
    .prepare(
      `SELECT vod_id, vod_name, vod_pic, vod_remarks, episode_name,
              episode_index, source_index, current_time, duration, updated_at, deleted
       FROM user_history
       WHERE user_id = ? AND sync_seq > ?
       ORDER BY updated_at DESC`,
    )
    .all(userId, safeSince) as Array<Record<string, unknown>>;

  const favRows = db
    .prepare(
      `SELECT vod_id, vod_name, vod_pic, vod_remarks, vod_score,
              type_name, vod_year, updated_at, deleted
       FROM user_favorites
       WHERE user_id = ? AND sync_seq > ?
       ORDER BY updated_at DESC`,
    )
    .all(userId, safeSince) as Array<Record<string, unknown>>;

  const setRows = db
    .prepare(
      `SELECT setting_key, setting_value, updated_at
       FROM user_settings
       WHERE user_id = ? AND sync_seq > ?`,
    )
    .all(userId, safeSince) as Array<Record<string, unknown>>;

  return {
    cursor,
    history: histRows.map((r) => ({
      vod_id: String(r.vod_id || ""),
      vod_name: String(r.vod_name || ""),
      vod_pic: String(r.vod_pic || ""),
      vod_remarks: String(r.vod_remarks || ""),
      episode_name: String(r.episode_name || ""),
      episode_index: Number(r.episode_index || 0),
      source_index: Number(r.source_index || 0),
      current_time: Number(r.current_time || 0),
      duration: Number(r.duration || 0),
      updated_at: Number(r.updated_at || 0),
      deleted: Boolean(r.deleted),
    })),
    favorites: favRows.map((r) => ({
      vod_id: String(r.vod_id || ""),
      vod_name: String(r.vod_name || ""),
      vod_pic: String(r.vod_pic || ""),
      vod_remarks: String(r.vod_remarks || ""),
      vod_score: String(r.vod_score || ""),
      type_name: String(r.type_name || ""),
      vod_year: String(r.vod_year || ""),
      updated_at: Number(r.updated_at || 0),
      deleted: Boolean(r.deleted),
    })),
    settings: setRows.map((r) => ({
      key: String(r.setting_key || ""),
      value: String(r.setting_value || ""),
      updated_at: Number(r.updated_at || 0),
    })),
  };
}
