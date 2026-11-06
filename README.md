# Phi Delt Pool League

A free, no-domain website for the Phi Delt pool league. It shows the ranked ladder, lets anyone log a singles or doubles game in a few taps, refits ratings automatically, and posts results to the league GroupMe.

## How the rating works

The ladder uses a custom Bayesian logistic model, not classic Elo. Full spec: `data/phi-delt-pool-website-handoff.md`.

- Everyone starts at 928.6, the league average.
- Every logged result is a data point. After each change, all ratings are refit from the full game history, so one result can shift other players too.
- Win chance uses the Elo curve: a 400 point gap is about a 91% win chance for the higher player.
- Each player has a singles skill and a doubles skill. Doubles teams also get a partnership effect. Overall skill is 2/3 singles plus 1/3 doubles.
- All games between the same two sides count as one matchup for W-L-T. The side with more total game wins gets the matchup win.
- Repeat wins over the same opponent add bounded confidence (a 3-0 weighs 1.33, a 5-0 weighs 1.5).
- Players with few games get an uncertainty penalty of half a standard deviation. The Elo shown is skill minus that penalty.

The tests in `tests/rating.test.ts` check the engine against every reference number in the handoff doc.

## Run locally

```
npm install
npm run dev
npm test
```

With no `.env.local`, the app runs in offline mode using the 193 seeded games from the handoff doc, held in memory only. Logged games reset on refresh.

## One time setup

### 1. Supabase (free)

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_poll_window_and_issues.sql`.
3. Copy the project URL, the `anon` key and the `service_role` key from Project Settings, API.
4. Seed the 39 players and 193 games:
   ```
   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm run seed
   ```
5. Copy `.env.example` to `.env.local` and fill in the URL and anon key to run against the real database locally.

### 2. GroupMe bot

1. Go to dev.groupme.com, sign in, and create a bot in the league group chat.
2. Copy the bot id.

### 3. Edge functions

Install the Supabase CLI, then:

```
supabase link --project-ref YOUR_REF
supabase secrets set GROUPME_BOT_ID=... SITE_URL=https://YOURUSER.github.io/phi-delt-pool-league CRON_SECRET=pick-a-long-random-string
supabase functions deploy announce
supabase functions deploy weekly --no-verify-jwt
```

`announce` posts each logged game with rank and Elo moves. `weekly` runs from GitHub Actions and decides what is due from the Pacific clock:

- Saturday 9:00am PT: "poll is open" post
- Sunday 6:00pm PT: "closes at midnight tonight" post
- Monday 11:30am PT: publishes the weekly issue (power poll results plus stat cards) to the News tab and posts the link

Preview any of it without posting by calling the function with `?dry=1`, and force a task with `?task=poll-open`, `poll-closing` or `issue`. The Actions workflow has the same options under Run workflow.

### 4. GitHub Pages

1. Create a repo named `phi-delt-pool-league` and push this project.
2. Settings, Pages, Source: GitHub Actions.
3. Settings, Secrets and variables, Actions, add `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `CRON_SECRET`.
4. Push to `main`. The site appears at `https://YOURUSER.github.io/phi-delt-pool-league/`.

The schedules live in `.github/workflows/weekly.yml`. They run at both the daylight and standard time UTC hours, and the function only acts once the Pacific time is reached, so each post happens once. GitHub can start scheduled runs a few minutes late.

## The weekly poll

The poll is open Saturday 9:00am to Sunday 11:59pm Pacific. The Weekly poll tab only shows while it is open, and the database rejects ballots outside that window. Voters pick their own name, then rank five players. A name can vote once per poll and cannot vote for itself. Ballots are private: the website can only see who has voted, never who they picked. Results are tallied by the Monday function, 5 points for first down to 1 for fifth, and published on the News tab with the next five players as "others receiving votes".

## Admin dashboard

Open `/#/admin` on the site (there is no link to it) and enter the admin password. It has two tabs:

- **Overview:** unique visitors, daily traffic, games tracked and logged on the site, players, polls, ballots, issues published, GroupMe posts, plus draft resume bullets you can copy.
- **Games:** the latest 300 games with a filter and a delete button. Deleting a game recalculates the ladder. A GroupMe post that already went out cannot be unsent.

The password is the `ADMIN_KEY` function secret, checked on the server by the `admin` edge function. The browser keeps it only for the tab session. Set or rotate it with:

```
supabase secrets set ADMIN_KEY=your-long-random-password
supabase functions deploy admin --no-verify-jwt
```

Visitors are recorded as one anonymous visit per browser per day: a random id kept in the browser, the page and the time. There are no names, IPs or accounts, and visits from localhost are ignored. The `visits` table can only be written by the website, never read. It needs the `0004_visits.sql` migration, and counting starts once that is applied.

## Free tier caveats

- Supabase pauses free projects after about a week of no activity. The weekly job keeps it awake.
- GitHub turns off scheduled workflows after 60 days without repo activity. A push or manual run turns them back on.
- The Supabase anon key ships in the site bundle by design. Row level security is the protection. Logging is open, so anyone with the link can add a game. Fix mistakes in the Supabase table editor.
