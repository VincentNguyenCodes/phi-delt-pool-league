import { aggregate, computeLeaderboard, matchupWeight } from "./rating.ts";
import { tally } from "./poll.ts";
import { weeklyStats, type DatedReport } from "./stats.ts";

export interface Card {
  key: string;
  title: string;
  headline: string;
  detail: string;
}

export interface PollRow {
  id: string;
  name: string;
  points: number;
  firstPlace: number;
}

export interface Issue {
  weekNumber: number;
  weekStart: string;
  dateLabel: string;
  poll: { id: string; ballots: number; top: PollRow[]; others: PollRow[] };
  weekCards: Card[];
  cards: Card[];
  notes: { form: string; model: string };
}

export interface IssueInput {
  reports: DatedReport[];
  names: Map<string, string>;
  since: number;
  until: number;
  weekNumber: number;
  weekStart: string;
  dateLabel: string;
  pollId: string;
  votes: number[][];
}

const MIN_FORM_GAMES = 4;
const MIN_DUO_MATCHUPS = 3;
const FORM_WINDOW = 20;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function dateLabel(year: number, month: number, day: number): string {
  return `${MONTHS[month - 1]} ${String(day).padStart(2, "0")}, ${year}`;
}

interface FormLeader {
  ids: string[];
  wins: number;
  losses: number;
  rate: number;
}

function formLeaders(recent: DatedReport[]): { hottest: FormLeader | null; coldest: FormLeader | null } {
  const games = new Map<string, number>();
  const wins = new Map<string, number>();
  const bump = (m: Map<string, number>, id: string, n: number) => m.set(id, (m.get(id) ?? 0) + n);
  for (const r of recent) {
    for (const id of r.sideA) {
      bump(games, id, r.winsA + r.winsB);
      bump(wins, id, r.winsA);
    }
    for (const id of r.sideB) {
      bump(games, id, r.winsA + r.winsB);
      bump(wins, id, r.winsB);
    }
  }
  const eligible = [...games.keys()].filter((id) => (games.get(id) ?? 0) >= MIN_FORM_GAMES);
  if (eligible.length === 0) return { hottest: null, coldest: null };
  const rate = (id: string) => (wins.get(id) ?? 0) / (games.get(id) ?? 1);
  const pick = (target: number): FormLeader => {
    const ids = eligible.filter((id) => rate(id) === target).sort();
    const w = wins.get(ids[0]) ?? 0;
    return { ids, wins: w, losses: (games.get(ids[0]) ?? 0) - w, rate: target };
  };
  const rates = eligible.map(rate);
  const hottest = pick(Math.max(...rates));
  const coldest = pick(Math.min(...rates));
  return { hottest, coldest: hottest.ids.join() === coldest.ids.join() ? null : coldest };
}

const empty = (key: string, title: string, headline: string, detail: string): Card => ({ key, title, headline, detail });

export function buildIssue(input: IssueInput): Issue {
  const name = (id: string) => input.names.get(id) ?? id;
  const list = (ids: string[]) => ids.map(name).join(", ");
  const upTo = input.reports.filter((r) => r.createdAt < input.until);
  const ledger = [...upTo].sort((a, b) => a.id - b.id);

  const rows = tally(input.votes).map((t) => ({
    id: String(t.id),
    name: name(String(t.id)),
    points: t.points,
    firstPlace: t.firstPlace,
  }));
  const poll = { id: input.pollId, ballots: input.votes.length, top: rows.slice(0, 5), others: rows.slice(5, 10) };

  const stats = weeklyStats(upTo, input.since, input.until);
  const none = "Nobody logged a game this week.";
  const leaderCard = (key: string, title: string, l: { ids: string[]; value: number } | null, detail: string) =>
    l ? { key, title, headline: `${list(l.ids)} / ${l.value}`, detail } : empty(key, title, "NONE THIS WEEK", none);
  const moveCard = (key: string, title: string, c: { id: string; from: number; to: number } | null, detail: string) =>
    c ? { key, title, headline: `${name(c.id)} / #${c.from} TO #${c.to}`, detail } : empty(key, title, "NO MOVEMENT", "Nobody changed rank this week.");

  const weekCards: Card[] = [
    stats.reports > 0
      ? {
          key: "games",
          title: "GAMES LOGGED",
          headline: `${stats.games} GAMES`,
          detail: `${stats.reports} reports were submitted this week, singles and doubles combined.`,
        }
      : empty("games", "GAMES LOGGED", "0 GAMES", none),
    leaderCard("mostGames", "MOST GAMES PLAYED", stats.mostGames, "Individual games played this week, singles and doubles combined."),
    leaderCard("mostWins", "MOST GAMES WON", stats.mostWins, "Individual games won this week. Ties are all listed."),
    leaderCard("mostLosses", "MOST GAMES LOST", stats.mostLosses, "Individual games lost this week. Ties are all listed."),
    moveCard("climb", "BIGGEST CLIMB", stats.riser, "Largest rise on the ladder compared with the start of the week."),
    moveCard("drop", "BIGGEST DROP", stats.faller, "Largest fall on the ladder compared with the start of the week."),
  ];

  const recent = ledger.slice(-FORM_WINDOW);
  const { hottest, coldest } = formLeaders(recent);
  const pct = (r: number) => `${Math.round(r * 100)}%`;
  const board = computeLeaderboard(ledger);
  const matchups = aggregate(ledger);

  const partners = new Map<string, Set<string>>();
  const formats = new Map<string, { singles: number; doubles: number }>();
  const teams = new Map<string, { ids: string[]; wins: number; losses: number }>();
  for (const m of matchups) {
    for (const side of [m.sideA, m.sideB]) {
      for (const id of side) {
        const f = formats.get(id) ?? { singles: 0, doubles: 0 };
        f[m.format]++;
        formats.set(id, f);
      }
    }
    if (m.format !== "doubles") continue;
    for (const [side, own, other] of [
      [m.sideA, m.a, m.b],
      [m.sideB, m.b, m.a],
    ] as [string[], number, number][]) {
      const [x, y] = side;
      (partners.get(x) ?? partners.set(x, new Set()).get(x)!).add(y);
      (partners.get(y) ?? partners.set(y, new Set()).get(y)!).add(x);
      const key = [...side].sort().join("|");
      const t = teams.get(key) ?? { ids: [...side].sort(), wins: 0, losses: 0 };
      if (own > other) t.wins++;
      else if (own < other) t.losses++;
      teams.set(key, t);
    }
  }

  const duos = [...teams.values()]
    .filter((t) => t.wins + t.losses >= MIN_DUO_MATCHUPS)
    .sort((a, b) => b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses) || b.wins + b.losses - (a.wins + a.losses));
  const duo = (t: { ids: string[]; wins: number; losses: number }) => `${t.ids.map(name).join(" + ")}`;
  const next = duos.slice(1, 3);

  const toughest = board.rows
    .filter((r) => (partners.get(r.id)?.size ?? 0) >= 3)
    .sort((a, b) => a.doubles - b.doubles)[0];
  const gapRow = board.rows
    .filter((r) => (formats.get(r.id)?.singles ?? 0) > 0 && (formats.get(r.id)?.doubles ?? 0) > 0)
    .sort((a, b) => b.doubles - b.singles - (a.doubles - a.singles))[0];
  const gap = gapRow ? gapRow.doubles - gapRow.singles : 0;
  const edge = matchups
    .filter((m) => m.format === "singles" && m.a !== m.b)
    .map((m) => ({ m, w: matchupWeight(m.a, m.b) }))
    .sort((a, b) => b.w - a.w || b.m.a + b.m.b - (a.m.a + a.m.b))[0];

  const noData = "NOT ENOUGH DATA";
  const cards: Card[] = [
    hottest
      ? {
          key: "hottest",
          title: "HOTTEST PLAYER",
          headline: `${list(hottest.ids)} / ${hottest.wins}-${hottest.losses}`,
          detail: `A ${pct(hottest.rate)} game win rate across the latest ${recent.length} reported results. Best recent rate among players with at least four individual games in that window.`,
        }
      : empty("hottest", "HOTTEST PLAYER", noData, "No player has four individual games in the latest 20 results."),
    coldest
      ? {
          key: "coldest",
          title: "COLDEST PLAYER",
          headline: `${list(coldest.ids)} / ${coldest.wins}-${coldest.losses}`,
          detail: `A ${pct(coldest.rate)} win rate in the same recent window. This is a short-run results measure, not a claim about their overall ability.`,
        }
      : empty("coldest", "COLDEST PLAYER", noData, "No separate coldest player in the latest 20 results."),
    duos[0]
      ? {
          key: "duos",
          title: "BEST DUOS",
          headline: `${duo(duos[0])} / ${duos[0].wins}-${duos[0].losses}`,
          detail: `Best unique-matchup win rate among duos with at least three matchups.${
            next.length ? ` Next: ${next.map((t) => `${t.ids.map(name).join("/")} (${t.wins}-${t.losses})`).join(" and ")}.` : ""
          } Different opposing teams count separately.`,
        }
      : empty("duos", "BEST DUOS", noData, "No duo has three matchups yet."),
    toughest
      ? {
          key: "toughest",
          title: "TOUGHEST PARTNER PICK",
          headline: `${name(toughest.id)} / ${toughest.doubles.toFixed(1)} DOUBLES`,
          detail: `Lowest modeled doubles skill among players with at least three different partners. ${
            partners.get(toughest.id)?.size ?? 0
          } partners in the sample. A model estimate, not a shot-by-shot assessment.`,
        }
      : empty("toughest", "TOUGHEST PARTNER PICK", noData, "No player has three different partners yet."),
    gapRow && gap > 0
      ? {
          key: "carried",
          title: 'THE "CARRIED?" WATCH',
          headline: `${name(gapRow.id)} / +${gap.toFixed(1)} GAP`,
          detail: `Doubles skill exceeds singles skill by ${gap.toFixed(1)} points, the largest gap in the league. Team fit, partner strength, or format preference could explain it; carrying is not proven.`,
        }
      : empty("carried", 'THE "CARRIED?" WATCH', noData, "Nobody has a doubles skill above their singles skill yet."),
    edge
      ? (() => {
          const aWins = edge.m.a > edge.m.b;
          const winner = name(aWins ? edge.m.sideA[0] : edge.m.sideB[0]);
          const loser = name(aWins ? edge.m.sideB[0] : edge.m.sideA[0]);
          return {
            key: "edge",
            title: "CLEAREST SINGLES EDGE",
            headline: `${winner} OVER ${loser} / ${Math.max(edge.m.a, edge.m.b)}-${Math.min(edge.m.a, edge.m.b)}`,
            detail: `Highest singles series-confidence weight in the ledger: ${edge.w.toFixed(3)}x. Repeated evidence favors ${winner} in this matchup; it does not guarantee the next game.`,
          };
        })()
      : empty("edge", "CLEAREST SINGLES EDGE", noData, "No decided singles matchup yet."),
  ];

  const first = recent[0]?.id;
  const last = recent[recent.length - 1]?.id;
  return {
    weekNumber: input.weekNumber,
    weekStart: input.weekStart,
    dateLabel: input.dateLabel,
    poll,
    weekCards,
    cards,
    notes: {
      form: `FORM WINDOW: latest ${recent.length} ledger reports (#${first ?? 0}-${last ?? 0}), counting individual games, minimum four games. Ties for hottest/coldest are retained.`,
      model: `MODEL: 2/3 singles + 1/3 doubles skill, minus half the estimated uncertainty. Shared partnership effects and bounded repeat-matchup weights. Snapshot: ${input.dateLabel} / ledger revision ${ledger.length}.`,
    },
  };
}
