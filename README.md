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
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
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

`announce` posts each logged game with rank and Elo moves. `weekly` posts last week's poll results, the weekly recap, and the new poll link. Check it without posting by calling it with `?dry=1`.

### 4. GitHub Pages

1. Create a repo named `phi-delt-pool-league` and push this project.
2. Settings, Pages, Source: GitHub Actions.
3. Settings, Secrets and variables, Actions, add `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `CRON_SECRET`.
4. Push to `main`. The site appears at `https://YOURUSER.github.io/phi-delt-pool-league/`.

The weekly recap runs from `.github/workflows/weekly.yml` every Sunday at 22:00 UTC. Poll weeks run Sunday to Saturday.

## Free tier caveats

- Supabase pauses free projects after about a week of no activity. The weekly job keeps it awake.
- GitHub turns off scheduled workflows after 60 days without repo activity. A push or manual run turns them back on.
- The Supabase anon key ships in the site bundle by design. Row level security is the protection. Logging is open, so anyone with the link can add a game. Fix mistakes in the Supabase table editor.
