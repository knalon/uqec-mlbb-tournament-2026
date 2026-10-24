# V1.5 Fully Simulated Tournament — FICTIONAL DATA

- Exactly 15 teams with exactly 5 invented Myanglish-style player names each (75 players). **These names do not represent or transcribe the school's handwritten list.**
- 21 group fixtures BO1, all completed, standings consistent with the demo playoff seeds.
- Four upper quarterfinals BO1 Day 1. Day 2: upper semis / lower early rounds BO1; U7, L5, L6 BO3; grand final BO5.
- Every playoff opponent derives from the prior winners/losers, with correct series scores and one simulated champion.
- Date/rooms retained from V1.4. All 35 results marked completed. This is an EXHIBITION DATASET only.

## Deploy
Back up your current GitHub CSV data first. Replace `data/players.csv`, `data/matches.csv`, `data/initial/players.csv`, `data/initial/matches.csv`, `js/app.js`, `index.html` using the PATCH ZIP. Keep current `config.js`, secrets, and Worker unchanged. To roll back to a fresh tournament, restore the earlier baseline CSV files instead of using Reset Everything, as this demo baseline is intentionally completed.

If Cloudflare has an unpublished local draft, export/discard it before reload. Spectators can still view the committed CSV through the site fallback if API unavailable.
