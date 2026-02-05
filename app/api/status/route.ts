import { kv } from "@vercel/kv";

export const runtime = "nodejs";

export async function GET() {
  const [server, onlineUuids, recentSessions] = await Promise.all([
    kv.get<any>("server:status"),
    kv.smembers<string>("online:uuids"),
    kv.lrange<any>("sessions:recent", 0, 19)
  ]);

  const onlinePlayers = onlineUuids.length
    ? (await kv.mget<any[]>(...onlineUuids.map(u => `player:${u}`))).filter(Boolean)
    : [];

  return Response.json({
    ok: true,
    server: server ?? { online: false, playersOnline: 0, lastPoll: 0 },
    onlinePlayers: onlinePlayers.map((p: any) => ({
      uuid: p.uuid,
      name: p.name,
      lastSeen: p.lastSeen,
      online: true,
      totalSessions: p.totalSessions ?? 0,
      totalPlayMs: p.totalPlayMs ?? 0
    })),
    recentSessions: (recentSessions ?? []).map((s: any) => ({
      uuid: s.uuid,
      name: s.name,
      start: s.start,
      end: s.end,
      durationMs: s.durationMs
    }))
  });
}
