import { useCallback, useEffect, useMemo, useState } from "react";
import { pollWeek, tally } from "../../shared/poll";
import PlayerCombobox from "../components/PlayerCombobox";
import Shield from "../components/Shield";
import { addPlayer, fetchVotes, submitVote, type Player } from "../lib/data";
import { useLedger } from "../lib/useLedger";

const SLOTS = 5;

function voterToken(): string {
  try {
    const existing = localStorage.getItem("pdpl-voter");
    if (existing) return existing;
    const made = crypto.randomUUID();
    localStorage.setItem("pdpl-voter", made);
    return made;
  } catch {
    return crypto.randomUUID();
  }
}

export default function Poll() {
  const { ledger, names, refresh } = useLedger();
  const week = useMemo(() => pollWeek(new Date()), []);
  const votedKey = `pdpl-voted-${week}`;
  const [picks, setPicks] = useState<(Player | null)[]>(Array(SLOTS).fill(null));
  const [voted, setVoted] = useState(() => {
    try {
      return localStorage.getItem(votedKey) === "1";
    } catch {
      return false;
    }
  });
  const [votes, setVotes] = useState<number[][]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadVotes = useCallback(async () => {
    try {
      setVotes(await fetchVotes(week));
    } catch {
      setVotes([]);
    }
  }, [week]);

  useEffect(() => {
    loadVotes();
  }, [loadVotes]);

  const create = async (name: string) => {
    const player = await addPlayer(name);
    await refresh();
    return player;
  };

  const chosen = picks.filter((p): p is Player => p !== null).map((p) => p.id);

  const submit = async () => {
    setProblem(null);
    if (chosen.length < SLOTS) {
      setProblem("Pick five players.");
      return;
    }
    setSaving(true);
    try {
      await submitVote(week, voterToken(), chosen);
      try {
        localStorage.setItem(votedKey, "1");
      } catch {
        setVoted(true);
      }
      setVoted(true);
      await loadVotes();
    } catch (e) {
      if (e instanceof Error && e.message.includes("already voted")) setVoted(true);
      setProblem(e instanceof Error ? e.message : "Could not save your vote.");
    } finally {
      setSaving(false);
    }
  };

  const results = useMemo(() => tally(votes), [votes]);

  return (
    <main className="log">
      <div className="eyebrow">PHI DELT / POWER POLL</div>
      <h2 className="page-title">Weekly top 5</h2>
      <p className="tagline">Rank your five best players. Your #1 gets 5 points, your #5 gets 1. Poll {week}.</p>

      {!voted && (
        <>
          <section className="side">
            {picks.map((p, i) => (
              <PlayerCombobox
                key={i}
                label={`#${i + 1}`}
                players={ledger?.players ?? []}
                value={p}
                excluded={chosen.filter((id) => id !== p?.id)}
                onChange={(next) =>
                  setPicks((cur) => {
                    const copy = [...cur];
                    copy[i] = next;
                    return copy;
                  })
                }
                onCreate={create}
              />
            ))}
          </section>
          {problem && <p className="problem">{problem}</p>}
          <div className="actions">
            <button className="primary" onClick={submit} disabled={saving || !ledger}>
              {saving ? "Saving..." : "Submit my top 5"}
            </button>
          </div>
        </>
      )}

      {voted && <p className="notice">Your ballot is in. Thanks for voting.</p>}

      {voted && results.length > 0 && (
        <section className="table">
          <div className="table-head poll-head">
            <span>RANK</span>
            <span />
            <span>PLAYER</span>
            <span className="right">POINTS</span>
          </div>
          {results.slice(0, 10).map((t, i) => {
            const name = names.get(String(t.id)) ?? String(t.id);
            return (
              <div key={t.id} className={i === 0 ? "row top poll-row" : "row poll-row"}>
                <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                <Shield name={name} />
                <span className="player">{name.toUpperCase()}</span>
                <span className="elo right">{t.points}</span>
              </div>
            );
          })}
          <p className="fineprint">{votes.length} ballots so far.</p>
        </section>
      )}
    </main>
  );
}
