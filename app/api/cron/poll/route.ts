import { kv } from "@vercel/kv";

export const runtime = "nodejs";

/**
 * Env vars in Vercel:
 * - STATUS_API_URL: your server status endpoint
 * - CRON_SECRET: random string
 *
 * Expected API response shape (example):
 * {
 *   "online": true,
 *   "motd": "CookieKraft",
 *   "version": "1.20.4",
 *   "players": {
 *     "online": 2,
 *     "max": 20,
 *     "list": [{ "uuid": "...", "name": "BBfiChe" }]
 *   }
 * }
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = Date.now();
  const url = process.env.STATUS_API_URL;
  if (!url) return new Response("Missing STATUS_API_URL", { status: 500 });

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return new Response("Status API error", { status: 502 });

  const payload: any = await res.json();

  const online = !!payload.online;
  const motd = payload.motd ?? payload?.motd?.clean ?? payload?.motd?.raw ?? "CookieKraft";
  const version = payload.version ?? payload?.version?.name ?? "";
  const playersOnline = payload?.players?.online ?? payload?.players?.onlineCount ?? 0;
  const playersMax = payload?.players?.max ?? payload?.players?.maxCount ?? undefined;

  const list = (payload?.players?.list ?? payload?.players?.sample ?? []).map((p: any) => ({
    uuid: String(p.uuid ?? p.id ?? ""),
    name: String(p.name ?? p.username ?? "unknown")
  })).filter((p: any) => p.uuid && p.name);

  // Save server status snapshot
  await kv.set("server:status", {
    online,
    motd: typeof motd === "string" ? motd : "CookieKraft",
    version: typeof version === "string" ? version : "",
    playersOnline: Number(playersOnline) || 0,
    playersMax: playersMax != null ? Number(playersMax) : undefined,
    lastPoll: now
  });

  // Session tracking
  const prevOnline = new Set(await kv.smembers<string>("online:uuids"));
  const nextOnline = new Set(list.map(p => p.uuid));

  const joined = [...nextOnline].filter(u => !prevOnline.has(u));
  const left = [...prevOnline].filter(u => !nextOnline.has(u));

  // Handle joins
  for (const uuid of joined) {
    const p = list.find(x => x.uuid === uuid)!;
    const key = `player:${uuid}`;

    const existing = (await kv.get<any>(key)) ?? { uuid, name: p.name, sessions: [], totalSessions: 0, totalPlayMs: 0 };
    await kv.set(key, {
      ...existing,
      uuid,
      name: p.name,
      lastSeen: now,
      currentSessionStart: now
    });

    await kv.sadd("online:uuids", uuid);
  }

  // Update currently online players' lastSeen + name
  for (const p of list) {
    const key = `player:${p.uuid}`;
    const existing = (await kv.get<any>(key)) ?? { uuid: p.uuid, name: p.name, sessions: [], totalSessions: 0, totalPlayMs: 0 };
    await kv.set(key, { ...existing, name: p.name, lastSeen: now });
    await kv.sadd("online:uuids", p.uuid);
  }

  // Handle leaves: close session
  for (const uuid of left) {
    const key = `player:${uuid}`;
    const existing = await kv.get<any>(key);
    if (existing?.currentSessionStart) {
      const start = Number(existing.currentSessionStart);
      const end = now;
      const durationMs = Math.max(0, end - start);

      const session = { uuid, name: existing.name ?? "unknown", start, end, durationMs };

      // push to recent list
      await kv.lpush("sessions:recent", session);
      await kv.ltrim("sessions:recent", 0, 49);

      // store per-player sessions (cap to last 50)
      const sessions = Array.isArray(existing.sessions) ? existing.sessions : [];
      sessions.unshift(session);
      if (sessions.length > 50) sessions.length = 50;

      await kv.set(key, {
        ...existing,
        lastSeen: now,
        currentSessionStart: null,
        sessions,
        totalSessions: (existing.totalSessions ?? 0) + 1,
        totalPlayMs: (existing.totalPlayMs ?? 0) + durationMs
      });
    }

    await kv.srem("online:uuids", uuid);
  }

  return Response.json({ ok: true, now, onlineCount: list.length, joined, left });
}
