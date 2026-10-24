# UQEC MLBB V1.3 · Two floor room schedule

31 Oct–1 Nov 2026. Demo-only times and assignments, not confirmed with school. Four games concurrently use all eight rooms; each match has its opponents on different floors in rooms with the same R-number (F1R1 vs F2R1, etc.). Room assignment alternates sides between waves. See `data/matches.csv` column `time` for current assignments. Format: `YYYY-MM-DD HH:MM | F1R1 vs F2R1`. The first room is assigned to team1 and the second to team2.

Day 1: 09:00, 09:45, 10:30 (4 matches each); 11:15, 12:00, 12:45 (3 each); 14:30 upper quarterfinals (4 BO1). Group stage 21 BO1; upper QF 4 BO1. Midday 13:30–14:30 reserve for rest, tie resolution, quarterfinal draw.

Day 2: 09:00 U5,U6,L1,L2; 10:45 L3,L4; 12:30 U7,L5; 14:15 L6; 16:00 GF. All Day 2 matches except GF are BO3; GF is BO5. Delays possible; these are scheduled *start targets*, not promises. No bracket reset.

ROOM SAFETY: Both floors should have stable internet, power, floor marshals and announcements. A responsible referee/lobby marshal must coordinate each match across its paired rooms. No opponent shares a room. Teams move per wave; on some rotations a team may stay put. Each player must verify assigned station before each fixture. Be mindful of accessibility between floors.

DEPLOY: upload `index.html`, `css/style.css`, `js/app.js`, `data/matches.csv`; also `data/initial/matches.csv` only if Reset Everything should restore this schedule. Other CSV files and Worker code are unchanged. Back up current match results before overwriting. The existing Worker accepts the same headers. No Node.js required.
