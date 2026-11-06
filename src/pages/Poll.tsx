import { useCallback, useEffect, useMemo, useState } from "react";
import PlayerCombobox from "../components/PlayerCombobox";
import { fetchVoters, submitBallot, type Player } from "../lib/data";
import { usePollStatus } from "../lib/usePollStatus";
import { useLedger } from "../lib/useLedger";

const SLOTS = 5;

export default function Poll() {
  const { ledger } = useLedger();
  const status = usePollStatus();
  const [voters, setVoters] = useState<number[]>([]);
  const [voter, setVoter] = useState<Player | null>(null);
  const [picks, setPicks] = useState<(Player | null)[]>(Array(SLOTS).fill(null));
  const [done, setDone] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadVoters = useCallback(async () => {
    if (!status.pollId) return;
    try {
      setVoters(await fetchVoters(status.pollId));
    } catch {
      setVoters([]);
    }
  }, [status.pollId]);

  useEffect(() => {
    loadVoters();
  }, [loadVoters]);

  const eligible = useMemo(
    () => (ledger?.players ?? []).filter((p) => !voters.includes(p.id)),
    [ledger, voters],
  );

  if (!status.open || !status.pollId) {
    const when = status.nextOpening.toLocaleString("en-US", {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
    });
    return (
      <main className="log">
        <div className="eyebrow">PHI DELT / POWER POLL</div>
        <h2 className="page-title">Poll is closed</h2>
        <p className="tagline">
          Voting opens every Saturday at 9:00am PT and closes Sunday at 11:59pm PT. The next poll opens {when} PT.
          Results drop Monday at 11:30am on the News tab.
        </p>
      </main>
    );
  }

  const chosen = picks.filter((p): p is Player => p !== null).map((p) => p.id);

  const reset = () => {
    setVoter(null);
    setPicks(Array(SLOTS).fill(null));
    setDone(null);
    setProblem(null);
  };

  const submit = async () => {
    setProblem(null);
    if (!voter) {
      setProblem("Pick your name first.");
      return;
    }
    if (chosen.length < SLOTS) {
      setProblem("Pick five players.");
      return;
    }
    setSaving(true);
    try {
      await submitBallot(status.pollId!, voter.id, chosen);
      setDone(voter.name);
      await loadVoters();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not save your ballot.");
      await loadVoters();
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <main className="log">
        <div className="eyebrow">BALLOT RECEIVED</div>
        <h2 className="result-title">Thanks, {done}. Your top 5 is in.</h2>
        <p className="tagline">Ballots are private. Results drop Monday at 11:30am on the News tab.</p>
        <div className="actions">
          <button className="secondary" onClick={reset}>
            Someone else is voting
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="log">
      <div className="eyebrow">PHI DELT / POWER POLL</div>
      <h2 className="page-title">Weekly top 5</h2>
      <p className="tagline">
        Open until Sunday 11:59pm PT. Pick your name, then rank your five best players. Your #1 gets 5 points down to 1
        point for #5. You cannot vote for yourself, and each name votes once.
      </p>

      <section className="side">
        <h3>Who are you?</h3>
        <PlayerCombobox
          label="Your name"
          players={eligible}
          value={voter}
          excluded={[]}
          onChange={(next) => {
            setVoter(next);
            setPicks(Array(SLOTS).fill(null));
          }}
        />
      </section>

      {voter && (
        <>
          <div className="beat">YOUR TOP 5</div>
          <section className="side">
            {picks.map((p, i) => (
              <PlayerCombobox
                key={i}
                label={`#${i + 1}`}
                players={ledger?.players ?? []}
                value={p}
                excluded={[voter.id, ...chosen.filter((id) => id !== p?.id)]}
                onChange={(next) =>
                  setPicks((cur) => {
                    const copy = [...cur];
                    copy[i] = next;
                    return copy;
                  })
                }
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
      {!voter && problem && <p className="problem">{problem}</p>}
    </main>
  );
}
