import { useState } from "react";
import { Link } from "react-router-dom";
import type { Record3 } from "../../shared/rating";
import Shield from "../components/Shield";
import { useLedger } from "../lib/useLedger";

const wlt = (r: Record3) => `${r.wins}-${r.losses}-${r.ties}`;

export default function Leaderboard() {
  const { board, names, error } = useLedger();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <main>
      <header className="masthead">
        <div className="eyebrow">PHI DELT / POOL LEAGUE</div>
        <h1>
          <span className="cream">PHI DELT</span>
          <span className="gold">POOL RANKINGS</span>
        </h1>
        <p className="tagline">Earn your rung. Defend your spot.</p>
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{board ? board.gamesPlayed : "-"}</div>
            <div className="stat-label">GAMES PLAYED</div>
          </div>
          <div className="stat">
            <div className="stat-value">{board ? board.players : "-"}</div>
            <div className="stat-label">PLAYERS</div>
          </div>
          <Link className="log-button" to="/log">
            Log a game
          </Link>
        </div>
      </header>

      {error && <p className="notice">{error}</p>}

      <section className="table" aria-label="Pool rankings">
        <div className="table-head ladder-grid">
          <span>RANK</span>
          <span />
          <span>PLAYER</span>
          <span className="right extra">1V1</span>
          <span className="right extra">2V2</span>
          <span className="right">MATCHUPS</span>
          <span className="right extra">GAMES</span>
          <span className="right">ELO</span>
        </div>
        {board?.rows.map((row) => {
          const name = names.get(row.id) ?? row.id;
          const expanded = open === row.id;
          return (
            <div key={row.id} className="ladder-item">
              <div
                className={row.rank === 1 ? "row ladder-grid top" : "row ladder-grid"}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(expanded ? null : row.id);
                  }
                }}
              >
                <span className="rank">{String(row.rank).padStart(2, "0")}</span>
                <Shield name={name} />
                <span className="player">{name.toUpperCase()}</span>
                <span className="wlt right extra">{wlt(row.singlesRecord)}</span>
                <span className="wlt right extra">{wlt(row.doublesRecord)}</span>
                <span className="wlt right">{wlt({ wins: row.wins, losses: row.losses, ties: row.ties })}</span>
                <span className="wlt right extra">
                  {row.gameWins}-{row.gameLosses}
                </span>
                <span className="elo right">{row.elo.toFixed(1)}</span>
              </div>
              {expanded && (
                <div className="ladder-more">
                  <span>
                    <b>1V1</b> {wlt(row.singlesRecord)}
                  </span>
                  <span>
                    <b>2V2</b> {wlt(row.doublesRecord)}
                  </span>
                  <span>
                    <b>GAMES</b> {row.gameWins}-{row.gameLosses}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {!board && !error && <p className="notice">Loading the ladder...</p>}
      </section>

      <p className="fineprint">
        1V1 and 2V2 count unique matchups in each format as wins-losses-ties. MATCHUPS counts every unique pairing once
        across both formats. GAMES counts every individual game won and lost. Repeat games add bounded confidence. Elo is
        the league ranking score; all standings are provisional.
        <span className="tap-hint"> Tap a player to see their 1V1, 2V2 and GAMES records.</span>
      </p>
    </main>
  );
}
