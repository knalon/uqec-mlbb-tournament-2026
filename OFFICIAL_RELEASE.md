# UQEC MLBB Official-data update (October 31, 2026)

- Source of truth: UQEC_MLBB_Official_Confirmed_Roster_Final.xlsx, Official Roster sheet.
- 15 allocated team IDs, 75 confirmed players, exact confirmed Myanmar and Myanglish names.
- Group allocation remains T01–T04=A, T05–T08=B, T09–T12=C, T13–T15=D. This is the previous website allocation and is **not** independently validated as a drawn group assignment.
- Team display names are Team 01 ... Team 15 until provided official names.
- All 35 match results cleared; unplayed playoff participants are empty and auto-populate from results. All eight manual seed overrides cleared.
- Day 1 schedule retains 10:00, 10:45, 11:30 group waves; 13:00 UB quarterfinals; 14:00 UB semifinals and LB round 1. Day 2 unchanged.
- F1R4 excluded as a temporary assumption: F1R1/F1R2/F1R3 max 3 teams; F2R1...F2R4 max 2. Opponents on opposite floors. Change the excluded room and regenerate assignments if a different room is unavailable.
- CRITICAL: Back up and replace active `data/{teams,players,matches,seeds}.csv` AND `data/initial/` baselines only if ready for real tournament. Worker resets will then restore this clean official baseline.
- Do not upload `.env` or GitHub tokens. Existing Worker unchanged.
- Draw card session remains separate and will not overwrite official team allocations.
