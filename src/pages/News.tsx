import { useEffect, useState } from "react";
import type { Card, Issue, PollRow } from "../../shared/news";
import Shield from "../components/Shield";
import { fetchIssues } from "../lib/data";

function Cards({ cards }: { cards: Card[] }) {
  return (
    <div className="cards">
      {cards.map((c) => (
        <article className="card" key={c.key}>
          <h4>{c.title}</h4>
          <p className="headline">{c.headline.toUpperCase()}</p>
          <p className="detail">{c.detail}</p>
        </article>
      ))}
    </div>
  );
}

function PollRows({ rows, start, muted }: { rows: PollRow[]; start: number; muted?: boolean }) {
  return (
    <>
      {rows.map((r, i) => (
        <div key={r.id} className={`row poll-news${!muted && i === 0 ? " top" : ""}${muted ? " muted" : ""}`}>
          <span className="rank">{String(start + i).padStart(2, "0")}</span>
          <Shield name={r.name} />
          <span className="player">{r.name.toUpperCase()}</span>
          <span className="wlt right">{r.firstPlace} first</span>
          <span className="elo right">{r.points}</span>
        </div>
      ))}
    </>
  );
}

export default function News() {
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues()
      .then(setIssues)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the news"));
  }, []);

  const issue = issues?.[selected];

  return (
    <main>
      <header className="masthead">
        <div className="masthead-top">
          <div className="eyebrow">PHI DELT / POOL LEAGUE</div>
          {issue && (
            <div className="issue-date">
              WEEK {String(issue.weekNumber).padStart(2, "0")} / {issue.dateLabel}
            </div>
          )}
        </div>
        <h1>
          <span className="cream">PHI DELT{issue ? ` WEEK ${issue.weekNumber}` : ""}</span>
          <span className="gold">WEEKLY NEWS</span>
        </h1>
        <p className="tagline">THE CHALK TALK / FORM, PARTNERSHIPS & RIVALRIES</p>
        {issues && issues.length > 1 && (
          <label className="archive">
            Issue
            <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
              {issues.map((i, idx) => (
                <option key={i.weekStart} value={idx}>
                  Week {i.weekNumber} / {i.dateLabel}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {error && <p className="notice">{error}</p>}
      {!issue && !error && issues && (
        <p className="notice">The first issue drops Monday at 11:30am. Check back then.</p>
      )}
      {!issues && !error && <p className="notice">Loading the news...</p>}

      {issue && (
        <>
          <section className="section">
            <h3 className="section-title">AP PHI DELT POWER POLL</h3>
            {issue.poll.top.length === 0 ? (
              <p className="notice">No ballots were cast for this poll.</p>
            ) : (
              <div className="table">
                <div className="table-head poll-news-head">
                  <span>RANK</span>
                  <span />
                  <span>PLAYER</span>
                  <span className="right">FIRST</span>
                  <span className="right">PTS</span>
                </div>
                <PollRows rows={issue.poll.top} start={1} />
                {issue.poll.others.length > 0 && (
                  <>
                    <h3 className="section-title sub">OTHERS RECEIVING VOTES</h3>
                    <PollRows rows={issue.poll.others} start={6} muted />
                  </>
                )}
              </div>
            )}
            <p className="fineprint">
              {issue.poll.ballots} ballots. Each ballot ranks five players: 5 points for first down to 1 for fifth. Ballots are
              private. Ties go to the player with more first place votes.
            </p>
          </section>

          <section className="section">
            <h3 className="section-title">THE WEEK IN NUMBERS</h3>
            <Cards cards={issue.weekCards} />
          </section>

          <section className="section">
            <h3 className="section-title">THE CHALK TALK</h3>
            <Cards cards={issue.cards} />
            <p className="fineprint">{issue.notes.form}</p>
            <p className="fineprint">{issue.notes.model}</p>
          </section>
        </>
      )}
    </main>
  );
}
