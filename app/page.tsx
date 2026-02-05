"use client";

import { useEffect, useMemo, useState } from "react";

type Player = {
  uuid: string;
  name: string;
  lastSeen: number;
  online: boolean;
  totalSessions?: number;
  totalPlayMs?: number;
};

type RecentSession = {
  uuid: string;
  name: string;
  start: number;
  end: number;
  durationMs: number;
};

type StatusResponse = {
  ok: boolean;
  server: {
    online: boolean;
    motd?: string;
    version?: string;
    playersOnline: number;
    playersMax?: number;
    lastPoll: number;
  };
  onlinePlayers: Player[];
  recentSessions: RecentSession[];
};

function msToNice(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function Page() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const json = (await res.json()) as StatusResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const headline = useMemo(() => {
    if (!data) return "Loading…";
    return data.server.online ? "Online" : "Offline";
  }, [data]);

  return (
    <div style={{ minHeight: "100vh", color: "white", background: "#05060a", position: "relative", overflow: "hidden" }}>
      {/* Animated background */}
      <div style={{
        position: "absolute", inset: -200,
        background: "radial-gradient(circle at 20% 20%, rgba(120,90,255,.25), transparent 55%), radial-gradient(circle at 80% 35%, rgba(0,255,200,.18), transparent 60%), radial-gradient(circle at 55% 90%, rgba(255,120,80,.16), transparent 60%)",
        filter: "blur(30px)",
        animation: "float 10s ease-in-out infinite",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        maskImage: "radial-gradient(circle at 50% 30%, black 35%, transparent 75%)",
        pointerEvents: "none"
      }} />
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(0,-25px,0) scale(1.02); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: .85; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>

      <div style={{ position: "relative", maxWidth: 980, margin: "0 auto", padding: "42px 18px 70px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>status.cookiekraft.net</div>
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>{headline}</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>
              {data?.server?.motd ? data.server.motd : "CookieKraft Server"}
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px",
            borderRadius: 16,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.12)",
            boxShadow: "0 10px 30px rgba(0,0,0,.35)"
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: 999,
              background: data?.server?.online ? "rgba(0,255,160,1)" : "rgba(255,80,80,1)",
              animation: "pulse 1.3s ease-in-out infinite"
            }} />
            <div style={{ fontWeight: 700 }}>
              {loading ? "Checking…" : `${data?.server.playersOnline ?? 0} online`}
            </div>
            <div style={{ opacity: 0.7, fontSize: 13 }}>
              {data?.server?.version ? `v${data.server.version}` : ""}
            </div>
          </div>
        </div>

        <div style={{ height: 22 }} />

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 14 }}>
          <div style={{
            borderRadius: 18,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.12)",
            padding: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Online players</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                last poll: {data ? new Date(data.server.lastPoll).toLocaleTimeString() : "—"}
              </div>
            </div>

            <div style={{ height: 10 }} />

            {(!data || data.onlinePlayers.length === 0) ? (
              <div style={{ opacity: 0.75, padding: 10 }}>
                {loading ? "Loading players…" : "No one online right now."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {data.onlinePlayers.map(p => (
                  <a
                    key={p.uuid}
                    href={`https://namemc.com/profile/${p.uuid}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      borderRadius: 16,
                      background: "rgba(0,0,0,.22)",
                      border: "1px solid rgba(255,255,255,.10)",
                      padding: 12,
                      display: "flex",
                      gap: 10,
                      alignItems: "center"
                    }}
                  >
                    <img
                      src={`https://crafatar.com/avatars/${p.uuid}?size=64&overlay`}
                      alt={p.name}
                      width={38}
                      height={38}
                      style={{ borderRadius: 12 }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, lineHeight: 1.1 }}>{p.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        seen {new Date(p.lastSeen).toLocaleTimeString()}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div style={{
            borderRadius: 18,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.12)",
            padding: 16
          }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Recent sessions</div>
            <div style={{ height: 10 }} />
            {!data ? (
              <div style={{ opacity: 0.75 }}>Loading…</div>
            ) : data.recentSessions.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No sessions logged yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.recentSessions.slice(0, 8).map((s, idx) => (
                  <div key={idx} style={{
                    borderRadius: 14,
                    background: "rgba(0,0,0,.22)",
                    border: "1px solid rgba(255,255,255,.10)",
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10
                  }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{s.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {new Date(s.start).toLocaleTimeString()} → {new Date(s.end).toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, opacity: 0.95 }}>
                      {msToNice(s.durationMs)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Tip: the polling + session tracking happens server-side. The page just reads stored data.
        </div>
      </div>
    </div>
  );
}
