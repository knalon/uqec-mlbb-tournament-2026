# V2.1 Official Tie Rules & Match Statistics

Win = 1 point; loss = 0. No drawn games, no tiebreaker games.

1. Rank by group wins.
2. Exactly two teams equal on wins: head-to-head.
3. Three or more teams equal: higher kill differential (team kills − deaths); then higher total kills; then shorter total duration of games WON.
4. If exactly two teams remain tied on all three metrics, head-to-head separates them.
5. Unresolved exact tie: supervised random draw; organizer enters the final eight seeds under Organizer → Playoff seeds.

All three statistics are mandatory for completed group matches. Group standings show K/D/K±; playoff games do not require these metrics.

## Deployment — important
This patch changes the `matches.csv` schema, so BOTH the frontend and the Cloudflare Worker must be updated. In Cloudflare's browser Worker editor, replace deployed code with `worker/index.js` and deploy. Do NOT commit tokens or credentials. Update `data/matches.csv` and `data/initial/matches.csv` on GitHub as well as `index.html` and `js/app.js`. Deploy Worker before importing the updated CSV.

Backup current match results before replacing CSVs. This patch retains all official teams, players and schedules but starts with blank score statistics. If live scores already exist, merge the five additional columns into your current CSV instead of replacing it.
