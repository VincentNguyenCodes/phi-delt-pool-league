import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminGame } from "../../shared/admin";
import type { ProjectStats } from "../../shared/projectStats";
import { AdminError, adminApi, adminAvailable } from "../lib/admin";

const STORAGE_KEY = "pdpl-admin";

function readKey(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function describe(g: AdminGame): string {
  const a = g.sideA.join(" / ");
  const b = g.sideB.join(" / ");
  if (g.winsA === g.winsB) return `${a} tied ${b} ${g.winsA}-${g.winsB}`;
  return g.winsA > g.winsB ? `${a} beat ${b} ${g.winsA}-${g.winsB}` : `${b} beat ${a} ${g.winsB}-${g.winsA}`;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <article className="card">
      <h4>{label}</h4>
      <p className="headline">{value}</p>
      {note && <p className="detail">{note}</p>}
    </article>
  );
}

function Overview({ adminKey, onDenied }: { adminKey: string; onDenied: () => void }) {
  const [data, setData] = useState<{ stats: ProjectStats; bullets: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    adminApi
      .stats(adminKey)
      .then(setData)
      .catch((e) => {
        if (e instanceof AdminError && e.status === 401) onDenied();
        else setError(e instanceof Error ? e.message : "Could not load stats");
      });
  }, [adminKey, onDenied]);

  if (error) return <p className="problem">{error}</p>;
  if (!data) return <p className="notice">Loading stats...</p>;
  const s = data.stats;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.bullets.map((b) => `- ${b}`).join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <h3 className="section-title">VISITORS</h3>
      <div className="cards">
        <Stat label="UNIQUE VISITORS" value={s.uniqueVisitors} note="Distinct browsers, counted anonymously." />
        <Stat label="DAILY VISITS" value={s.totalVisits} note="One per browser per day." />
        <Stat label="DAYS WITH TRAFFIC" value={s.activeDays} />
        <Stat label="AVG VISITORS PER DAY" value={s.avgDailyVisitors} note={`Peak day: ${s.peakDayVisitors}`} />
      </div>

      <h3 className="section-title spaced">GAMES AND PLAYERS</h3>
      <div className="cards">
        <Stat label="GAMES TRACKED" value={s.gamesAllTime} note={`${s.reportsAllTime} reports, ${s.matchupsAllTime} unique matchups`} />
        <Stat label="GAMES LOGGED ON THE SITE" value={s.gamesLive} note={`${s.reportsLive} reports in ${s.daysLive} days`} />
        <Stat label="PLAYERS ON THE LADDER" value={s.playersOnLadder} note={`${s.playersWhoPlayedLive} played on the site`} />
        <Stat label="PLAYERS ADDED ON THE SITE" value={s.playersAdded} />
      </div>

      <h3 className="section-title spaced">POLL, NEWS AND BOT</h3>
      <div className="cards">
        <Stat label="POLLS RUN" value={s.polls} />
        <Stat label="BALLOTS CAST" value={s.ballots} note={`${s.uniqueVoters} unique voters`} />
        <Stat label="WEEKLY ISSUES PUBLISHED" value={s.issues} />
        <Stat label="GROUPME POSTS SENT" value={s.groupMePosts} />
      </div>

      <h3 className="section-title spaced">DRAFT RESUME BULLETS</h3>
      <p className="fineprint">Edit the wording and keep only numbers you can explain.</p>
      <ul className="bullets">
        {data.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <div className="actions">
        <button className="secondary" onClick={copy}>
          {copied ? "Copied" : "Copy bullets"}
        </button>
      </div>
    </>
  );
}

function Games({ adminKey, onDenied }: { adminKey: string; onDenied: () => void }) {
  const [games, setGames] = useState<AdminGame[] | null>(null);
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setGames((await adminApi.games(adminKey)).games);
      setError(null);
    } catch (e) {
      if (e instanceof AdminError && e.status === 401) onDenied();
      else setError(e instanceof Error ? e.message : "Could not load games");
    }
  }, [adminKey, onDenied]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!games) return [];
    return q ? games.filter((g) => describe(g).toLowerCase().includes(q) || String(g.id) === q) : games;
  }, [games, filter]);

  const remove = async (g: AdminGame) => {
    const ok = window.confirm(
      `Delete game #${g.id}?\n\n${describe(g)}\n\nThe ladder will recalculate without it. A GroupMe post that already went out cannot be unsent. This cannot be undone.`,
    );
    if (!ok) return;
    try {
      await adminApi.deleteGame(adminKey, g.id);
      setNotice(`Deleted game #${g.id}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the game");
    }
  };

  return (
    <>
      <input
        value={filter}
        placeholder="Filter by player name or game number"
        onChange={(e) => setFilter(e.target.value)}
      />
      {notice && <p className="notice">{notice}</p>}
      {error && <p className="problem">{error}</p>}
      {!games && !error && <p className="notice">Loading games...</p>}
      <div className="game-list">
        {shown.map((g) => (
          <div className="game-row" key={g.id}>
            <span className="game-id">#{g.id}</span>
            <span className="game-text">
              {describe(g)}
              <em className="game-meta">
                {g.format} / {when(g.createdAt)}
              </em>
            </span>
            <button className="danger" onClick={() => remove(g)}>
              Delete
            </button>
          </div>
        ))}
        {games && shown.length === 0 && <p className="notice">No games match.</p>}
      </div>
      {games && <p className="fineprint">Showing the latest {games.length} games.</p>}
    </>
  );
}

export default function Admin() {
  const [adminKey, setAdminKey] = useState(readKey);
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "games">("overview");

  const lock = useCallback(() => {
    setAdminKey("");
    setAuthed(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      return;
    }
  }, []);

  const unlock = useCallback(async (key: string) => {
    setChecking(true);
    setProblem(null);
    try {
      await adminApi.check(key);
      setAdminKey(key);
      setAuthed(true);
      try {
        sessionStorage.setItem(STORAGE_KEY, key);
      } catch {
        return;
      }
    } catch (e) {
      setAuthed(false);
      setProblem(e instanceof AdminError && e.status === 401 ? "Wrong password." : "Could not reach the server.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (adminAvailable && adminKey) unlock(adminKey);
  }, []);

  const denied = useCallback(() => {
    lock();
    setProblem("That session expired. Enter the password again.");
  }, [lock]);

  if (!adminAvailable) {
    return (
      <main className="log">
        <div className="eyebrow">ADMIN</div>
        <h2 className="page-title">Admin</h2>
        <p className="tagline">The admin page needs the live database, so it does not work in offline mode.</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="log">
        <div className="eyebrow">ADMIN</div>
        <h2 className="page-title">Admin</h2>
        <section className="side">
          <h3>Password</h3>
          <input
            type="password"
            value={input}
            autoComplete="off"
            placeholder="Admin password"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && input && unlock(input)}
          />
        </section>
        {problem && <p className="problem">{problem}</p>}
        <div className="actions">
          <button className="primary" disabled={checking || !input} onClick={() => unlock(input)}>
            {checking ? "Checking..." : "Unlock"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="masthead-top">
        <div className="eyebrow">PHI DELT / ADMIN</div>
        <button className="link-button" onClick={lock}>
          Lock
        </button>
      </div>
      <h2 className="page-title">Admin dashboard</h2>
      <div className="toggle" role="tablist">
        {(["overview", "games"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            {t === "overview" ? "Overview" : "Games"}
          </button>
        ))}
      </div>
      {tab === "overview" ? <Overview adminKey={adminKey} onDenied={denied} /> : <Games adminKey={adminKey} onDenied={denied} />}
    </main>
  );
}
