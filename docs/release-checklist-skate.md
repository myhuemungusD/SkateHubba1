# SKATE play feature – release checklist (MVP → prod testing)

- **Auth**: Confirm Google sign-in works on deployed URL; profile redirect not blocking game pages.
- **Firestore index**: Add composite for games query  
  Collection `games`: `where(players array-contains uid)` + `orderBy(lastActionAt desc)`.
- **Firestore rules** (baseline to enforce server-side):
  - Only `request.auth.uid` in `game.players` can read/write their game.
  - Accept/decline only when `state.status == "PENDING_ACCEPT"`; accept only by `players[1]`.
  - `startRoundByAttacker` only when `state.status == "ACTIVE"`, `state.turn == requester`, `openRoundId == null`; increment `roundsCount`; set `openRoundId`.
  - `submitDefenderReply` only when `state.status == "ACTIVE"`, round `status == "AWAITING_DEFENDER"`, `defenderId == requester`, `openRoundId` matches round; letter increments capped at 5; set `openRoundId` null.
  - Prevent writes to other fields (use allowlist).
- **Client guardrails**:
  - Create: block self-challenge, require opponent UID.
  - Submit trick: require valid http/https URL.
  - Game actions: blocked by guards for turn/status/open round.
- **Happy-path tests** (manual on deployed URL):
  1) User A creates game vs User B; game appears in both lists as Pending.
  2) User B accepts; status becomes Active, turn set to creator.
  3) User A sets trick; round appears, primary action for B is Reply.
  4) User B replies MAKE; turn stays with A; no letters change.
  5) User A sets another trick; User B replies BAIL; letter increments; turn stays with A.
  6) Repeat until one player hits SKATE → status Completed, winner visible, actions disabled.
- **Edge tests**:
  - Create with empty/invalid URL → blocked client-side.
  - Create self-challenge → blocked client-side.
  - Attempt set trick while open round exists → blocked by guard.
  - Attempt reply by non-defender or mismatched open round → blocked by guard.
  - Decline as non-player → blocked by guard/rules.
- **Logging/monitoring**:
  - Enable Firestore usage/latency logs.
  - Capture client console errors during test cycle.
- **Comms**:
  - Provide testers with 2–3 test UIDs and the game flow steps above.
  - Mention known warnings: Next `<img>` lint warnings (auth/profile) are cosmetic only.
