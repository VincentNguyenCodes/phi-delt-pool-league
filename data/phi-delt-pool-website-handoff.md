# Phi Delt Pool League — Website Developer Handoff

**November 5, 2026 · Revision 43**

| Players | Result reports | Individual games | Unique matchups | Average published Elo | Starting Elo |
|---:|---:|---:|---:|---:|---:|
| 39 | 193 | 253 | 154 | 867.4 | 928.6 |

## Results and records

- A report identifies two sides and the number of games won by each. Each singles side has one player and each doubles side has two distinct players. An unscored win defaults to 1–0.
- Normalize player aliases before grouping. Ahmed = AK, Sam Wyler = Send, nickmo/nikcmo = Nick Mo, and Andrew/Chen = Andrew Chen. Guest1 and Vinny are separate players.
- Sort the player IDs within each side and then sort the two sides to create a unique matchup key. Keep scores aligned when reversing sides. Aggregate all reports for that exact matchup.
- Award one matchup win to the side with more cumulative game wins, one loss to the other side, or one tie to both sides. Each member of a doubles team receives the same matchup outcome.
- Keep raw game wins and losses separately. A 3–1 report represents four games and updates a single matchup. Corrections replace the affected report by ID. Distinct reports of the same matchup add to the cumulative score.
- Preserve report order. Actual game dates and season reset rules are unspecified.
- Everyone shares a starting skill of 928.6 in both formats, based on the league average at the model change. The shared reference stays fixed across routine refits. There are no preseason categories.

## Rating implementation

Reworked October 28, 2026 to add bounded matchup-specific confidence from repeated wins, preserving uncertainty rules. Custom Bayesian logistic model, not official Elo/Glicko/TrueSkill. All 193 result batches, 154 unique matchups, and 39 players retained.

All players share a neutral starting skill in both formats, set to the preceding league average published Elo (928.6 for this refit). This reference stays fixed across routine refits so the uncertainty deduction does not compound into a league-wide rating drop. Player labels have no effect. Existing results are refit from the complete ledger.

S_i and D_i have independent Normal(mu_i,200^2) priors. Every unordered partnership C_ij has independent Normal(0,150^2) prior. Singles strength is S_i; doubles team strength is (D_i+D_j)/2+C_ij. Predicted win p=logistic(ln(10)/400 * strength difference).

For each unique matchup, aggregate raw wins a,b and n=a+b. Define confidence weight c=1+((n-1)/(n+3))*((a-b)/n)^2. The outcome target remains y=1 for the cumulative leader, 0 for the trailing side, and 0.5 for a tie. Minimize sum_i[((S_i-mu_i)^2+(D_i-mu_i)^2)/(2*200^2)] + sum_pairs[C_ij^2/(2*150^2)] - sum_unique_matchups[c*(y*log(p)+(1-y)*log(1-p))]. Use the same weights in the Laplace Hessian: I+B.T@diag(c*p*(1-p))@B in standardized coordinates.

This is a custom bounded evidence-weighting policy, not a calibrated confidence probability or an ordinary independent-rack Bayesian likelihood. Each unique matchup still contributes one official record entry. Its model weight starts at 1 and stays below 2, regardless of games played. More consistent results add weight with diminishing returns; close series add little extra weight. Examples: 1-0=1.0000; 2-0=1.2000; 3-0=1.3333; 5-0=1.5000; 5-1=1.2469; 3-2=1.0200. Tied series retain weight 1 and y=0.5; this revision deliberately adds confidence in superiority, not extra precision for repeated ties. A comeback can reduce the weight, and crossing a tie still changes the outcome target discretely. Do not interpret the logistic output as an empirically calibrated per-rack win rate.

Confidence belongs to the exact singles pairing or exact two teams in doubles. It affects shared player and partnership estimates through the full refit; it is not a global multiplier on a player's other matches. Additional weight strengthens evidence but does not guarantee every individual uncertainty decreases after nonlinear refitting. No 0.75 doubles likelihood multiplier. All historical series are reweighted retroactively; priors, format blend, and uncertainty penalty remain unchanged.

Skill estimate M_i=(2*S_i+D_i)/3. The public leaderboard now sorts by conservative ranking score R_i=M_i-0.5*U_i. U_i is approximate posterior standard deviation of that 2:1 blend. S and D likelihoods are independent conditional on current priors, so U_i=sqrt((4/9)*Var(S_i)+(1/9)*Var(D_i)); covariance is zero. Variances use a Laplace inverse-Hessian approximation. This is a modest half-standard-deviation discount, not a 95% bound or calibrated guarantee. Model skill estimates, not conservative ranking scores, determine opponent strength.

Unplayed formats retain the shared starting skill and full 200-point uncertainty. The ranking score applies the same uncertainty adjustment to every player after fitting results.

The 66.7%/33.3% split applies to the skill estimate. The final leaderboard additionally adjusts for uncertainty. Separate published columns make this distinction explicit. Repeated partner results retain shared pair effects; the model does not claim to know who carried. Identical evidence can produce identical changes.

### Reproduction and website integration

1. Store reports with stable IDs, format, player IDs for each side, and integer wins for each side. Validate distinct players within and across sides, nonnegative scores, and at least one game per report.
2. Build one design row per canonical matchup. In standardized coordinates, singles coefficients are +200 and −200. Doubles coefficients are +100 or −100 per player and +150 or −150 per partnership. Multiply the entire row by ln(10)/400. All standardized parameters start at zero.
3. Minimize the weighted logistic objective with an L2 penalty of half the squared standardized parameter norm. Use logaddexp(0, z) − y*z for stable evaluation. Invert the fitted Hessian for parameter variances, then multiply the player variances by 200² before blending.
4. Convert player parameters back with skill = 928.6 + 200*x and partnership effect = 150*x. Sort by full-precision ranking score descending and display one decimal place.
5. Refit after adding or correcting reports. Publish the result history, rankings, player records, and league totals from the same revision. The ranking and record tables below are reference outputs for checking the implementation.

### Regression examples

- Pi beat AK in three singles reports. Their cumulative singles score is 3–0, the weight is 1.3333, and Pi gets one matchup win.
- The latest Vinny–Ritz result is 2–1. Vinny debuts at rank 10 with 905.1 published Elo and a 1–0–0 matchup record.
- The full dataset contains 193 reports and 253 individual games. Kartman is second at 1026.3 and Pi leads at 1035.0.

## Full standings

All reported results included; repeated messages counted once. Confidence-weighted model applied retroactively to every matchup.
| Rank | Player | Ranking score | Skill estimate | Singles estimate | Doubles estimate | Overall uncertainty U | Current prior center |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Pi | 1035.0 | 1092.4 | 1142.9 | 991.4 | 114.8 | 928.6 |
| 2 | Kartman | 1026.3 | 1081.1 | 1159.5 | 924.2 | 109.6 | 928.6 |
| 3 | Frosty | 990.2 | 1038.6 | 1050.7 | 1014.4 | 96.7 | 928.6 |
| 4 | Lev | 981.6 | 1034.1 | 1113.8 | 874.5 | 104.9 | 928.6 |
| 5 | Drew | 962.8 | 1002.7 | 987.2 | 1033.8 | 79.9 | 928.6 |
| 6 | AK | 956.9 | 1002.8 | 1015.3 | 977.8 | 91.9 | 928.6 |
| 7 | Send | 956.6 | 1019.8 | 1044.3 | 971.0 | 126.4 | 928.6 |
| 8 | Wael | 940.2 | 997.8 | 984.9 | 1023.5 | 115.1 | 928.6 |
| 9 | Soren | 933.2 | 985.7 | 999.2 | 958.7 | 105.0 | 928.6 |
| 10 | Vinny | 905.1 | 973.6 | 996.1 | 928.6 | 137.0 | 928.6 |
| 11 | Cooper | 904.9 | 965.4 | 994.7 | 906.7 | 120.9 | 928.6 |
| 12 | Nick Mo | 879.3 | 933.0 | 855.6 | 1087.9 | 107.3 | 928.6 |
| 13 | Reagan | 871.7 | 945.7 | 928.6 | 979.9 | 148.0 | 928.6 |
| 14 | Sam Benn | 871.0 | 945.1 | 928.6 | 978.1 | 148.2 | 928.6 |
| 15 | Harry | 867.6 | 941.7 | 928.6 | 968.0 | 148.3 | 928.6 |
| 16 | Kethan | 867.2 | 941.4 | 928.6 | 967.0 | 148.3 | 928.6 |
| 17 | Guest1 | 866.9 | 941.1 | 928.6 | 966.2 | 148.4 | 928.6 |
| 18 | Julian | 863.7 | 921.1 | 933.8 | 895.6 | 114.8 | 928.6 |
| 19 | Paul | 861.9 | 935.6 | 928.6 | 949.6 | 147.4 | 928.6 |
| 20 | Justin | 852.3 | 926.1 | 928.6 | 921.0 | 147.5 | 928.6 |
| 21 | John | 851.1 | 900.8 | 947.6 | 807.2 | 99.4 | 928.6 |
| 22 | Dane | 845.7 | 920.0 | 928.6 | 902.7 | 148.5 | 928.6 |
| 23 | Sir | 845.3 | 904.4 | 855.2 | 1002.9 | 118.3 | 928.6 |
| 24 | Kenta | 844.2 | 917.7 | 928.6 | 895.8 | 146.9 | 928.6 |
| 25 | Travis | 843.2 | 917.4 | 928.6 | 895.1 | 148.3 | 928.6 |
| 26 | Roman | 840.4 | 899.0 | 869.9 | 957.2 | 117.2 | 928.6 |
| 27 | Jonah | 838.4 | 912.5 | 928.6 | 880.2 | 148.2 | 928.6 |
| 28 | Shawarma | 838.1 | 895.6 | 903.6 | 879.5 | 114.9 | 928.6 |
| 29 | Bob | 832.3 | 906.3 | 928.6 | 861.6 | 147.9 | 928.6 |
| 30 | Steve | 831.3 | 884.3 | 886.4 | 880.2 | 106.2 | 928.6 |
| 31 | Ryan Lee | 823.9 | 889.8 | 859.6 | 950.1 | 131.7 | 928.6 |
| 32 | Edward | 822.0 | 878.8 | 890.7 | 855.1 | 113.7 | 928.6 |
| 33 | Ritz | 795.4 | 851.5 | 834.4 | 885.7 | 112.2 | 928.6 |
| 34 | Noah | 794.1 | 861.0 | 840.5 | 902.0 | 133.9 | 928.6 |
| 35 | Ali | 790.3 | 843.8 | 841.1 | 849.0 | 106.8 | 928.6 |
| 36 | Kawan | 787.1 | 853.2 | 820.4 | 919.0 | 132.3 | 928.6 |
| 37 | Andrew Chen | 777.5 | 827.1 | 813.3 | 854.7 | 99.3 | 928.6 |
| 38 | Dih | 717.3 | 760.9 | 695.3 | 892.2 | 87.2 | 928.6 |
| 39 | Lemos | 716.7 | 766.5 | 736.1 | 827.2 | 99.6 | 928.6 |

## Player records

| Player | Unique matchups | Unique W-L-T | Raw W-L |
|---|---:|---|---|
| Frosty | 18 | 12-6-0 | 22-11 |
| Lemos | 27 | 8-19-0 | 15-28 |
| Drew | 49 | 29-16-4 | 47-39 |
| Steve | 14 | 5-9-0 | 5-9 |
| Dih | 46 | 16-27-3 | 31-45 |
| Ryan Lee | 8 | 4-4-0 | 5-6 |
| Ali | 15 | 6-9-0 | 8-12 |
| Soren | 16 | 9-6-1 | 13-10 |
| Sir | 5 | 3-2-0 | 3-2 |
| Shawarma | 16 | 6-9-1 | 10-12 |
| AK | 26 | 15-11-0 | 29-22 |
| Wael | 18 | 12-6-0 | 17-9 |
| Kartman | 23 | 13-10-0 | 18-16 |
| Lev | 27 | 14-12-1 | 19-16 |
| Send | 14 | 8-5-1 | 12-6 |
| Edward | 13 | 4-8-1 | 9-12 |
| Jonah | 1 | 0-1-0 | 0-1 |
| Ritz | 9 | 3-6-0 | 4-7 |
| Julian | 18 | 10-8-0 | 14-11 |
| Kethan | 1 | 1-0-0 | 1-0 |
| Kawan | 7 | 3-4-0 | 4-5 |
| Cooper | 13 | 6-6-1 | 9-11 |
| Andrew Chen | 21 | 7-13-1 | 10-15 |
| Justin | 2 | 1-1-0 | 1-1 |
| John | 38 | 14-22-2 | 20-30 |
| Nick Mo | 16 | 10-6-0 | 15-13 |
| Noah | 4 | 1-3-0 | 2-5 |
| Travis | 1 | 0-1-0 | 0-1 |
| Kenta | 3 | 1-2-0 | 2-3 |
| Reagan | 2 | 2-0-0 | 2-0 |
| Dane | 1 | 0-1-0 | 0-1 |
| Bob | 2 | 0-2-0 | 0-2 |
| Pi | 10 | 8-2-0 | 11-3 |
| Sam Benn | 1 | 1-0-0 | 1-0 |
| Harry | 1 | 1-0-0 | 1-0 |
| Roman | 9 | 5-4-0 | 7-6 |
| Paul | 3 | 2-1-0 | 2-1 |
| Guest1 | 1 | 1-0-0 | 1-0 |
| Vinny | 1 | 1-0-0 | 2-1 |

## Partnership estimates

| Partnership | Estimated effect |
|---|---:|
| AK / Andrew Chen | +39.45 |
| AK / Dih | +37.78 |
| AK / Drew | -51.98 |
| AK / John | -28.91 |
| AK / Kartman | -52.93 |
| AK / Lemos | -46.37 |
| AK / Lev | +35.67 |
| AK / Nick Mo | +29.84 |
| AK / Pi | -25.67 |
| AK / Ritz | +46.59 |
| AK / Roman | +53.13 |
| AK / Shawarma | -38.40 |
| AK / Soren | +53.33 |
| AK / Wael | +3.82 |
| Ali / Dih | -8.66 |
| Ali / Drew | -57.48 |
| Ali / John | -55.87 |
| Ali / Justin | +54.12 |
| Ali / Kawan | -73.81 |
| Ali / Lemos | -31.42 |
| Ali / Sir | +83.61 |
| Andrew Chen / Cooper | -43.68 |
| Andrew Chen / Dih | +8.17 |
| Andrew Chen / Edward | +7.46 |
| Andrew Chen / Frosty | +39.22 |
| Andrew Chen / John | -79.86 |
| Andrew Chen / Kartman | -105.86 |
| Andrew Chen / Nick Mo | +51.98 |
| Bob / Frosty | -75.41 |
| Cooper / Frosty | +61.83 |
| Cooper / John | -71.87 |
| Cooper / Justin | -62.68 |
| Cooper / Nick Mo | +35.52 |
| Cooper / Pi | +56.29 |
| Dane / Edward | -29.15 |
| Dih / Drew | +71.90 |
| Dih / Edward | -28.55 |
| Dih / Julian | +35.46 |
| Dih / Lemos | -119.55 |
| Dih / Lev | -1.87 |
| Dih / Nick Mo | -32.08 |
| Dih / Roman | -46.59 |
| Dih / Ryan Lee | +35.79 |
| Dih / Send | +17.53 |
| Dih / Shawarma | +40.63 |
| Dih / Steve | -50.86 |
| Drew / Edward | -18.72 |
| Drew / John | +125.08 |
| Drew / Kartman | -65.11 |
| Drew / Lemos | -19.40 |
| Drew / Lev | +0.59 |
| Drew / Paul | +23.67 |
| Drew / Reagan | +57.70 |
| Drew / Ritz | +40.38 |
| Drew / Send | +45.99 |
| Drew / Soren | +44.12 |
| Drew / Steve | -12.93 |
| Drew / Wael | -65.44 |
| Edward / Kartman | -73.01 |
| Edward / Kenta | +59.27 |
| Frosty / John | +43.68 |
| Frosty / Lemos | +69.44 |
| Frosty / Lev | -44.07 |
| Frosty / Steve | -41.71 |
| Frosty / Wael | +43.51 |
| Guest1 / Send | +42.26 |
| Harry / Wael | +44.31 |
| John / Kartman | +57.48 |
| John / Lemos | -36.30 |
| John / Lev | -27.54 |
| John / Nick Mo | +12.11 |
| John / Pi | -35.52 |
| John / Soren | -29.84 |
| John / Steve | -51.42 |
| John / Wael | +42.19 |
| Jonah / Shawarma | -54.40 |
| Julian / Kartman | -59.27 |
| Julian / Noah | +51.99 |
| Julian / Ritz | -58.12 |
| Julian / Ryan Lee | -46.83 |
| Julian / Send | +81.94 |
| Julian / Soren | -42.26 |
| Kartman / Kawan | +63.02 |
| Kartman / Kethan | +43.17 |
| Kartman / Lev | +131.90 |
| Kartman / Sam Benn | +55.65 |
| Kenta / Noah | -44.17 |
| Kenta / Send | -51.99 |
| Lemos / Lev | -61.17 |
| Lemos / Pi | +52.93 |
| Lemos / Ritz | -37.78 |
| Lemos / Ryan Lee | +53.56 |
| Lemos / Send | -35.22 |
| Lemos / Shawarma | +14.95 |
| Lemos / Soren | +18.21 |
| Lemos / Steve | +64.04 |
| Lev / Roman | -24.64 |
| Lev / Ryan Lee | +30.73 |
| Lev / Send | -53.64 |
| Lev / Shawarma | -46.77 |
| Nick Mo / Pi | +22.60 |
| Nick Mo / Shawarma | +30.29 |
| Nick Mo / Wael | +28.91 |
| Noah / Travis | -37.73 |
| Ritz / Ryan Lee | -39.38 |
| Roman / Wael | +50.31 |
| Ryan Lee / Soren | -9.69 |
| Send / Shawarma | +0.82 |
| Shawarma / Steve | +38.45 |
| Shawarma / Wael | -40.81 |

## Full game results

Each row represents one submitted report, with the two scores in the same order as the listed sides. The original report numbers remain stable.

| Report | Format | Side A | Side B | A wins | B wins |
|---:|---|---|---|---:|---:|
| 1 | Singles | Lemos | Drew | 1 | 0 |
| 2 | Singles | Drew | Steve | 1 | 0 |
| 3 | Doubles | Drew / Steve | Lemos / Dih | 1 | 0 |
| 4 | Singles | Frosty | Drew | 5 | 1 |
| 5 | Singles | Frosty | Ryan Lee | 2 | 0 |
| 6 | Singles | Dih | Ali | 1 | 0 |
| 7 | Singles | Dih | Soren | 1 | 0 |
| 8 | Singles | Soren | Dih | 2 | 0 |
| 9 | Singles | Soren | Sir | 1 | 0 |
| 10 | Doubles | Steve / Shawarma | AK / Wael | 1 | 0 |
| 11 | Singles | Steve | Sir | 1 | 0 |
| 12 | Singles | Soren | Steve | 1 | 0 |
| 13 | Doubles | Soren / Drew | AK / Shawarma | 1 | 0 |
| 14 | Doubles | Lev / Kartman | Drew / Soren | 1 | 0 |
| 15 | Doubles | Drew / Soren | Edward / Kartman | 1 | 0 |
| 16 | Doubles | Drew / Soren | Send / Shawarma | 1 | 0 |
| 17 | Doubles | Send / Shawarma | Kartman / Edward | 1 | 0 |
| 18 | Singles | Drew | Dih | 2 | 1 |
| 19 | Singles | Kartman | Drew | 1 | 0 |
| 20 | Singles | Dih | Drew | 4 | 3 |
| 21 | Singles | Wael | Dih | 1 | 0 |
| 22 | Singles | Lev | Wael | 1 | 0 |
| 23 | Singles | Dih | Lev | 1 | 0 |
| 24 | Doubles | Dih / Lev | Shawarma / Jonah | 1 | 0 |
| 25 | Singles | Shawarma | Ritz | 1 | 0 |
| 26 | Doubles | Shawarma / Lemos | Ritz / Julian | 1 | 0 |
| 27 | Doubles | Kartman / Kethan | Shawarma / Lemos | 1 | 0 |
| 28 | Doubles | Kartman / Kawan | Ryan Lee / Julian | 2 | 1 |
| 29 | Singles | Cooper | Edward | 1 | 0 |
| 30 | Doubles | Edward / Andrew Chen | Cooper / Justin | 1 | 0 |
| 31 | Doubles | John / Nick Mo | Drew / Kartman | 1 | 0 |
| 32 | Doubles | Kawan / Kartman | Drew / Lev | 1 | 0 |
| 33 | Singles | Edward | Drew | 1 | 1 |
| 34 | Doubles | Julian / Send | Edward / Drew | 2 | 0 |
| 35 | Doubles | Julian / Send | Noah / Travis | 1 | 0 |
| 36 | Doubles | Julian / Send | Kenta / Noah | 2 | 0 |
| 37 | Doubles | Julian / Noah | Kenta / Send | 1 | 0 |
| 38 | Singles | Lev | Drew | 1 | 1 |
| 39 | Singles | Drew | Lemos | 1 | 0 |
| 40 | Singles | Drew | Edward | 2 | 1 |
| 41 | Doubles | Drew / Reagan | Edward / Dane | 1 | 0 |
| 42 | Doubles | Drew / Reagan | Edward / Dih | 1 | 0 |
| 43 | Doubles | Lev / Drew | John / Andrew Chen | 1 | 0 |
| 44 | Singles | John | Andrew Chen | 1 | 0 |
| 45 | Doubles | Frosty / Andrew Chen | Cooper / John | 1 | 0 |
| 46 | Doubles | Frosty / Cooper | John / Andrew Chen | 1 | 0 |
| 47 | Doubles | Frosty / Andrew Chen | Cooper / John | 1 | 0 |
| 48 | Doubles | Frosty / John | Cooper / Andrew Chen | 1 | 0 |
| 49 | Singles | Kartman | Frosty | 3 | 2 |
| 50 | Singles | Andrew Chen | Dih | 1 | 0 |
| 51 | Doubles | Dih / Andrew Chen | Drew / Edward | 1 | 1 |
| 52 | Doubles | Drew / Edward | Kartman / Andrew Chen | 1 | 0 |
| 53 | Doubles | Drew / Edward | Kartman / Andrew Chen | 1 | 0 |
| 54 | Doubles | Kartman / Drew | Andrew Chen / Edward | 1 | 0 |
| 55 | Doubles | Lemos / Steve | Kartman / Drew | 1 | 0 |
| 56 | Doubles | Soren / Ryan Lee | John / Lemos | 1 | 0 |
| 57 | Doubles | Drew / Send | Soren / Ryan Lee | 1 | 0 |
| 58 | Singles | Frosty | Dih | 3 | 1 |
| 59 | Doubles | Dih / Drew | Frosty / Steve | 1 | 0 |
| 60 | Singles | Ritz | Ali | 1 | 0 |
| 61 | Doubles | Dih / Drew | Bob / Frosty | 1 | 0 |
| 62 | Doubles | Drew / Ritz | Frosty / Bob | 1 | 0 |
| 63 | Singles | Frosty | Ritz | 1 | 0 |
| 64 | Singles | Lev | Dih | 2 | 0 |
| 65 | Singles | Pi | Steve | 1 | 0 |
| 66 | Singles | Steve | Dih | 1 | 0 |
| 67 | Singles | Pi | Dih | 1 | 0 |
| 68 | Singles | Ali | Dih | 1 | 0 |
| 69 | Doubles | Wael / John | Kartman / Kawan | 1 | 0 |
| 70 | Doubles | Kartman / Sam Benn | John / Wael | 1 | 0 |
| 71 | Doubles | John / Wael | Andrew Chen / Kartman | 1 | 0 |
| 72 | Singles | Julian | Noah | 2 | 1 |
| 73 | Singles | Drew | Lemos | 1 | 0 |
| 74 | Doubles | Drew / Lev | Lemos / Dih | 1 | 0 |
| 75 | Doubles | Lev / Dih | Lemos / Drew | 1 | 0 |
| 76 | Doubles | Drew / Dih | Lemos / Lev | 1 | 0 |
| 77 | Singles | Ali | Dih | 1 | 0 |
| 78 | Singles | Send | Drew | 2 | 0 |
| 79 | Singles | Sir | Andrew Chen | 1 | 0 |
| 80 | Singles | Andrew Chen | Ali | 2 | 0 |
| 81 | Singles | Kartman | Andrew Chen | 1 | 0 |
| 82 | Singles | Pi | Shawarma | 1 | 0 |
| 83 | Singles | Soren | Drew | 1 | 0 |
| 84 | Singles | Pi | Shawarma | 1 | 0 |
| 85 | Singles | Lev | Dih | 1 | 0 |
| 86 | Singles | Drew | Dih | 1 | 0 |
| 87 | Singles | Drew | Soren | 1 | 0 |
| 88 | Singles | Kartman | Drew | 2 | 1 |
| 89 | Singles | Drew | John | 1 | 0 |
| 90 | Doubles | Drew / John | Wael / Shawarma | 1 | 0 |
| 91 | Doubles | Wael / Harry | Dih / Shawarma | 1 | 0 |
| 92 | Doubles | Kartman / John | Drew / Ali | 1 | 0 |
| 93 | Doubles | Dih / Nick Mo | Ali / John | 1 | 0 |
| 94 | Singles | Dih | Ali | 1 | 0 |
| 95 | Singles | Ali | Dih | 1 | 0 |
| 96 | Doubles | Shawarma / Nick Mo | John / Cooper | 3 | 1 |
| 97 | Singles | AK | Nick Mo | 1 | 0 |
| 98 | Doubles | Wael / Nick Mo | AK / John | 2 | 0 |
| 99 | Doubles | AK / John | Nick Mo / Wael | 2 | 0 |
| 100 | Doubles | Wael / Nick Mo | AK / John | 1 | 0 |
| 101 | Doubles | Drew / Lemos | Dih / Steve | 1 | 0 |
| 102 | Doubles | Lev / Kartman | Drew / Dih | 1 | 0 |
| 103 | Doubles | Wael / Frosty | Drew / Steve | 1 | 0 |
| 104 | Singles | AK | Drew | 1 | 0 |
| 105 | Doubles | Andrew Chen / Nick Mo | Drew / AK | 1 | 0 |
| 106 | Singles | Lemos | AK | 1 | 0 |
| 107 | Singles | Nick Mo | Drew | 2 | 1 |
| 108 | Singles | AK | Nick Mo | 3 | 0 |
| 109 | Singles | AK | Soren | 1 | 0 |
| 110 | Doubles | AK / Nick Mo | Soren / John | 1 | 0 |
| 111 | Doubles | AK / Soren | Nick Mo / John | 1 | 0 |
| 112 | Singles | John | Nick Mo | 1 | 0 |
| 113 | Singles | AK | Lemos | 2 | 1 |
| 114 | Doubles | AK / Andrew Chen | Dih / Lemos | 1 | 0 |
| 115 | Doubles | Sir / Ali | AK / Andrew Chen | 1 | 0 |
| 116 | Doubles | AK / Andrew Chen | Nick Mo / Dih | 1 | 0 |
| 117 | Doubles | Drew / John | Steve / Shawarma | 1 | 0 |
| 118 | Doubles | Ali / Sir | John / Steve | 1 | 0 |
| 119 | Doubles | Pi / Nick Mo | John / Steve | 1 | 0 |
| 120 | Doubles | Nick Mo / Cooper | Pi / John | 1 | 0 |
| 121 | Doubles | Pi / Cooper | Nick Mo / John | 1 | 0 |
| 122 | Singles | Ali | Kawan | 1 | 0 |
| 123 | Doubles | AK / Wael | Lemos / Ali | 1 | 0 |
| 124 | Doubles | Soren / Lemos | AK / Wael | 1 | 0 |
| 125 | Doubles | AK / Wael | Soren / Lemos | 1 | 0 |
| 126 | Doubles | AK / Wael | Soren / Lemos | 1 | 0 |
| 127 | Doubles | AK / Wael | Soren / Lemos | 1 | 0 |
| 128 | Doubles | John / Wael | AK / Lemos | 1 | 0 |
| 129 | Singles | Lev | Roman | 1 | 0 |
| 130 | Singles | Wael | Roman | 1 | 0 |
| 131 | Doubles | Wael / Roman | Lev / John | 1 | 0 |
| 132 | Doubles | Wael / Roman | Ali / John | 1 | 0 |
| 133 | Singles | Dih | Lemos | 1 | 0 |
| 134 | Doubles | Roman / AK | Wael / John | 1 | 0 |
| 135 | Doubles | Ritz / AK | Dih / Roman | 1 | 0 |
| 136 | Doubles | AK / Dih | Lemos / Ritz | 1 | 0 |
| 137 | Singles | AK | Lemos | 1 | 0 |
| 138 | Singles | Lemos | Dih | 1 | 0 |
| 139 | Singles | Dih | Lemos | 1 | 0 |
| 140 | Doubles | Dih / Ryan Lee | Lev / Lemos | 1 | 0 |
| 141 | Doubles | Ryan Lee / Lemos | Lev / Dih | 1 | 0 |
| 142 | Doubles | Ryan Lee / Lev | Lemos / Dih | 1 | 0 |
| 143 | Doubles | Soren / Lemos | Lev / Dih | 2 | 0 |
| 144 | Singles | Shawarma | Dih | 1 | 0 |
| 145 | Singles | Lev | AK | 1 | 0 |
| 146 | Doubles | AK / Lev | John / Cooper | 2 | 1 |
| 147 | Doubles | Drew / Paul | Frosty / Lev | 1 | 0 |
| 148 | Doubles | Drew / Paul | Dih / Julian | 1 | 0 |
| 149 | Doubles | Frosty / Lemos | Drew / Paul | 1 | 0 |
| 150 | Singles | Frosty | Lemos | 1 | 0 |
| 151 | Doubles | Dih / Julian | Shawarma / Lev | 1 | 0 |
| 152 | Doubles | Dih / Julian | Send / Lev | 1 | 0 |
| 153 | Doubles | Dih / Julian | Ali / Kawan | 1 | 0 |
| 154 | Doubles | Julian / Send | Ali / Kawan | 1 | 0 |
| 155 | Doubles | John / Nick Mo | Drew / Wael | 1 | 0 |
| 156 | Doubles | Drew / John | Dih / Lev | 1 | 0 |
| 157 | Doubles | Dih / Send | Drew / John | 1 | 0 |
| 158 | Doubles | Drew / John | Send / Dih | 1 | 0 |
| 159 | Doubles | Dih / Drew | Lemos / Send | 1 | 0 |
| 160 | Singles | Julian | Dih | 1 | 0 |
| 161 | Doubles | Dih / Lev | Julian / Send | 1 | 0 |
| 162 | Singles | Cooper | John | 1 | 0 |
| 163 | Doubles | John / Cooper | Roman / Lev | 1 | 0 |
| 164 | Doubles | Ali / Dih | John / Cooper | 1 | 0 |
| 165 | Doubles | Ali / Justin | Lev / Dih | 1 | 0 |
| 166 | Doubles | Roman / Lev | Dih / Ali | 1 | 0 |
| 167 | Singles | Roman | Lemos | 1 | 0 |
| 168 | Singles | Lemos | Roman | 1 | 0 |
| 169 | Singles | Roman | Lemos | 1 | 0 |
| 170 | Singles | AK | Lemos | 1 | 0 |
| 171 | Singles | Drew | AK | 3 | 1 |
| 172 | Singles | John | Cooper | 1 | 0 |
| 173 | Singles | Lev | Dih | 1 | 0 |
| 174 | Doubles | Frosty / Cooper | Ritz / Ryan Lee | 1 | 0 |
| 175 | Singles | Frosty | Nick Mo | 1 | 0 |
| 176 | Singles | AK | Frosty | 2 | 0 |
| 177 | Singles | Pi | AK | 1 | 0 |
| 178 | Doubles | Pi / AK | Dih / Julian | 1 | 0 |
| 179 | Doubles | Dih / Shawarma | AK / Pi | 2 | 0 |
| 180 | Singles | Dih | Shawarma | 1 | 0 |
| 181 | Singles | Pi | AK | 1 | 0 |
| 182 | Doubles | Pi / Lemos | AK / Kartman | 1 | 0 |
| 183 | Singles | Pi | AK | 1 | 0 |
| 184 | Singles | Lemos | Andrew Chen | 1 | 0 |
| 185 | Doubles | Send / Guest1 | Julian / Soren | 1 | 0 |
| 186 | Doubles | Kartman / Kawan | Andrew Chen / John | 1 | 0 |
| 187 | Doubles | John / Drew | Andrew Chen / Kartman | 1 | 0 |
| 188 | Doubles | Edward / Kenta | Kartman / Julian | 2 | 0 |
| 189 | Singles | Edward | Julian | 1 | 0 |
| 190 | Singles | Roman | Lemos | 1 | 0 |
| 191 | Singles | Kartman | John | 1 | 0 |
| 192 | Singles | Wael | Roman | 1 | 0 |
| 193 | Singles | Vinny | Ritz | 2 | 1 |
