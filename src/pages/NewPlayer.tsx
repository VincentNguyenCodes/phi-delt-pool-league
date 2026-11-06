import { useState } from "react";
import { Link } from "react-router-dom";
import { addPlayer, type Player } from "../lib/data";
import { cleanName, findExisting } from "../lib/names";
import { useLedger } from "../lib/useLedger";

export default function NewPlayer() {
  const { ledger, refresh } = useLedger();
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [added, setAdded] = useState<Player | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setProblem(null);
    let clean: string;
    try {
      clean = cleanName(name);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "That name does not work.");
      return;
    }
    const existing = findExisting(clean, ledger?.players ?? []);
    if (existing) {
      setProblem(`${existing.name} is already in the league.`);
      return;
    }
    setSaving(true);
    try {
      setAdded(await addPlayer(clean));
      await refresh();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not add the player.");
    } finally {
      setSaving(false);
    }
  };

  if (added) {
    return (
      <main className="log">
        <div className="eyebrow">WELCOME TO THE LEAGUE</div>
        <h2 className="result-title">{added.name} is in.</h2>
        <p className="tagline">
          They start at the league average rating and will show up on the ladder after their first game.
        </p>
        <div className="actions">
          <Link className="primary" to="/log">
            Log a game
          </Link>
          <button
            className="secondary"
            onClick={() => {
              setAdded(null);
              setName("");
            }}
          >
            Add another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="log">
      <div className="eyebrow">PHI DELT / POOL LEAGUE</div>
      <h2 className="page-title">Add new player</h2>
      <p className="tagline">New to the league? Add your name so you can be picked when games are logged.</p>

      <section className="side">
        <h3>Name</h3>
        <input
          value={name}
          placeholder="First name or the name everyone uses"
          autoCapitalize="words"
          autoComplete="off"
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </section>

      {problem && <p className="problem">{problem}</p>}

      <div className="actions">
        <button className="primary" onClick={submit} disabled={saving || !ledger || !name.trim()}>
          {saving ? "Adding..." : "Add player"}
        </button>
        <Link className="secondary" to="/">
          Cancel
        </Link>
      </div>
    </main>
  );
}
