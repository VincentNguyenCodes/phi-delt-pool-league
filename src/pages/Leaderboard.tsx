import { Link } from "react-router-dom";
import Shield from "../components/Shield";
import { useLedger } from "../lib/useLedger";

export default function Leaderboard() {
  const { board, names, error } = useLedger();

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
        <div className="table-head">
          <span>RANK</span>
          <span />
          <span>PLAYER</span>
          <span className="right">W-L-T</span>
          <span className="right">ELO</span>
        </div>
        {board?.rows.map((row) => {
          const name = names.get(row.id) ?? row.id;
          return (
            <div key={row.id} className={row.rank === 1 ? "row top" : "row"}>
              <span className="rank">{String(row.rank).padStart(2, "0")}</span>
              <Shield name={name} />
              <span className="player">{name.toUpperCase()}</span>
              <span className="wlt right">
                {row.wins}-{row.losses}-{row.ties}
              </span>
              <span className="elo right">{row.elo.toFixed(1)}</span>
            </div>
          );
        })}
        {!board && !error && <p className="notice">Loading the ladder...</p>}
      </section>

      <p className="fineprint">
        Records count unique singles and doubles matchups. Repeat games add bounded confidence. Elo is the league
        ranking score; all standings are provisional.
      </p>
    </main>
  );
}
