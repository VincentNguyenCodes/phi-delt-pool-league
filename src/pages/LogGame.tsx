import { useState } from "react";
import { Link } from "react-router-dom";
import { computeLeaderboard, diffLeaderboards, type Format, type Move } from "../../shared/rating";
import PlayerCombobox from "../components/PlayerCombobox";
import { addPlayer, announce, logGame, type Player } from "../lib/data";
import { useLedger } from "../lib/useLedger";

type Slot = Player | null;

export default function LogGame() {
  const { ledger, board, names, error, refresh } = useLedger();
  const [format, setFormat] = useState<Format>("singles");
  const [winners, setWinners] = useState<Slot[]>([null, null]);
  const [losers, setLosers] = useState<Slot[]>([null, null]);
  const [winnerGames, setWinnerGames] = useState("1");
  const [loserGames, setLoserGames] = useState("0");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [moves, setMoves] = useState<Move[] | null>(null);
  const [summary, setSummary] = useState("");
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const size = format === "singles" ? 1 : 2;
  const winnerSlots = winners.slice(0, size);
  const loserSlots = losers.slice(0, size);
  const chosen = [...winnerSlots, ...loserSlots].filter((p): p is Player => p !== null).map((p) => p.id);
  const players = ledger?.players ?? [];

  const create = async (name: string) => {
    const player = await addPlayer(name);
    await refresh();
    return player;
  };

  const setSlot = (list: Slot[], set: (s: Slot[]) => void, i: number) => (p: Slot) => {
    const next = [...list];
    next[i] = p;
    set(next);
  };

  const reset = () => {
    setWinners([null, null]);
    setLosers([null, null]);
    setWinnerGames("1");
    setLoserGames("0");
    setMoves(null);
    setProblem(null);
  };

  const submit = async () => {
    setProblem(null);
    if (!ledger || !board) return;
    const a = winnerSlots.filter((p): p is Player => p !== null);
    const b = loserSlots.filter((p): p is Player => p !== null);
    if (a.length < size || b.length < size) {
      setProblem(format === "singles" ? "Pick both players." : "Pick all four players.");
      return;
    }
    const wa = Number(winnerGames);
    const wb = Number(loserGames);
    if (!Number.isInteger(wa) || !Number.isInteger(wb) || wa < 0 || wb < 0 || wa + wb < 1) {
      setProblem("Enter a valid score with at least one game.");
      return;
    }
    if (wa < wb) {
      setProblem("The first side should have the higher score. Swap the players instead.");
      return;
    }
    setSaving(true);
    try {
      const id = await logGame({
        format,
        sideA: a.map((p) => p.id),
        sideB: b.map((p) => p.id),
        winsA: wa,
        winsB: wb,
      });
      const after = computeLeaderboard([
        ...ledger.reports,
        { id, format, sideA: a.map((p) => String(p.id)), sideB: b.map((p) => String(p.id)), winsA: wa, winsB: wb },
      ]);
      const involved = [...a, ...b].map((p) => String(p.id));
      setMoves(diffLeaderboards(board, after, involved));
      const label = (side: Player[]) => side.map((p) => p.name).join(" / ");
      setSummary(`${label(a)} ${wa === wb ? "tied" : "beat"} ${label(b)} ${wa}-${wb}`);
      announce(id);
      await refresh();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not save the game.");
    } finally {
      setSaving(false);
    }
  };

  const submitNew = async () => {
    if (!newName.trim()) return;
    try {
      await create(newName);
      setNewName("");
      setShowAdd(false);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not add the player.");
    }
  };

  if (moves) {
    return (
      <main className="log">
        <div className="eyebrow">GAME LOGGED</div>
        <h2 className="result-title">{summary}</h2>
        <div className="moves">
          {moves.map((m) => {
            const shift = m.rankBefore === null ? 0 : m.rankBefore - m.rankAfter;
            const delta = m.eloBefore === null ? null : m.eloAfter - m.eloBefore;
            return (
              <div className="move" key={m.id}>
                <span className="move-name">{(names.get(m.id) ?? m.id).toUpperCase()}</span>
                <span className="move-rank">
                  {m.rankBefore === null ? "NEW" : `#${m.rankBefore}`} to #{m.rankAfter}
                  {shift !== 0 && (
                    <em className={shift > 0 ? "up" : "down"}>
                      {shift > 0 ? ` +${shift}` : ` ${shift}`}
                    </em>
                  )}
                </span>
                <span className="move-elo">
                  {m.eloAfter.toFixed(1)}
                  {delta !== null && (
                    <em className={delta >= 0 ? "up" : "down"}>
                      {" "}
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)}
                    </em>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <div className="actions">
          <button className="primary" onClick={reset}>
            Log another
          </button>
          <Link className="secondary" to="/">
            View ladder
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="log">
      <div className="eyebrow">PHI DELT / POOL LEAGUE</div>
      <h2 className="page-title">Log a game</h2>

      <div className="toggle" role="tablist">
        {(["singles", "doubles"] as Format[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={format === f}
            className={format === f ? "on" : ""}
            onClick={() => setFormat(f)}
          >
            {f === "singles" ? "Singles" : "Doubles"}
          </button>
        ))}
      </div>

      <section className="side">
        <h3>Winner{size === 2 ? "s" : ""}</h3>
        {winnerSlots.map((p, i) => (
          <PlayerCombobox
            key={`w${i}`}
            label={size === 2 ? `Player ${i + 1}` : "Name"}
            players={players}
            value={p}
            excluded={chosen.filter((id) => id !== p?.id)}
            onChange={setSlot(winners, setWinners, i)}
            onCreate={create}
          />
        ))}
      </section>

      <div className="beat">BEAT</div>

      <section className="side">
        <h3>Loser{size === 2 ? "s" : ""}</h3>
        {loserSlots.map((p, i) => (
          <PlayerCombobox
            key={`l${i}`}
            label={size === 2 ? `Player ${i + 1}` : "Name"}
            players={players}
            value={p}
            excluded={chosen.filter((id) => id !== p?.id)}
            onChange={setSlot(losers, setLosers, i)}
            onCreate={create}
          />
        ))}
      </section>

      <section className="score">
        <label>
          Winner games
          <input inputMode="numeric" value={winnerGames} onChange={(e) => setWinnerGames(e.target.value)} />
        </label>
        <span className="dash">-</span>
        <label>
          Loser games
          <input inputMode="numeric" value={loserGames} onChange={(e) => setLoserGames(e.target.value)} />
        </label>
      </section>

      {(problem || error) && <p className="problem">{problem ?? error}</p>}

      <div className="actions">
        <button className="primary" onClick={submit} disabled={saving || !ledger}>
          {saving ? "Saving..." : "Log game"}
        </button>
        <Link className="secondary" to="/">
          Cancel
        </Link>
      </div>

      <div className="add-player">
        {showAdd ? (
          <div className="add-row">
            <input
              value={newName}
              placeholder="New player name"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNew()}
            />
            <button className="secondary" onClick={submitNew}>
              Add
            </button>
          </div>
        ) : (
          <button className="link" onClick={() => setShowAdd(true)}>
            + Add a new player
          </button>
        )}
      </div>
    </main>
  );
}
