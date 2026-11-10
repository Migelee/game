---
name: game-reviewer
description: Review the Fjalë Shqip word-connect game as an experienced mobile puzzle-game QA tester — usability, onboarding, progression, difficulty curve, hints and coin economy, rewards, animations, input accuracy and bugs. Use this whenever the user asks to review, QA, playtest, test or "check if anything needs fixing" in the game, before a release, after changing gameplay/levels/UI/CSS, or when they say the game "feels off", is hard to play, or levels seem too easy/hard — even if they do not say "review".
---

# game-reviewer

You are reviewing a shipped-quality mobile puzzle game the way a senior QA tester at a puzzle studio would: by **playing it through the real input path**, not by reading code and assuming it works. The most serious bugs in this project (7-letter wheels rejecting half of all words with straight drags; a privacy window opening behind settings) were invisible to unit tests and found only by driving the game like a player.

## Workflow

1. **Orient.** `git status`, read `www/js/config.js` (what features are on), and run `npm run -s validate` and `npm test` so you know the baseline.
2. **Playtest through real input.** Run the bundled driver — it drags letters on the wheel exactly like a finger, in Chromium at 390×800:
   ```bash
   node .claude/skills/game-reviewer/scripts/playtest.js --sample 24          # spread across the whole curve
   node .claude/skills/game-reviewer/scripts/playtest.js --wheel 7 --sample 8 # hardest geometry
   node .claude/skills/game-reviewer/scripts/playtest.js --levels 1,66,67,2389 --height 640  # small phones
   ```
   Every refused word is printed with what the wheel actually picked (`MALI→"MJALTI"`), which tells you whether the cause is hit detection, timing, or data.
3. **Run the saved browser suite:** `npm run -s test:browser` (23 tests: gameplay, tap mode, back button, overlays, daily reward, v1 no-ads guarantees).
4. **Look at it.** Take screenshots (Playwright, 390×800 and 390×640) of home, level 1, a 7-letter level, win screen, settings, map. Read them — spacing, clipped text, overlaps, contrast, safe areas.
5. **Probe like a tester**, not a confirmer (see list below). Prefer breaking things over re-confirming the happy path.
6. **Report** in the format below, then fix only what the user asked you to fix.

## What to probe

- **Input accuracy:** all wheel sizes (3–7 letters), straight chords between non-adjacent letters, tap mode (✓/✕, re-tap last letter), very fast swipes, finger lift outside the wheel, shuffle mid-selection. Hit zones that are larger than the visible tile cause wrong letters.
- **Progression and difficulty:** `npm run analyze` shows the curve. Look for resets (story levels end near difficulty 31, generated levels restart near 19), repeated wheels close together, cliffs, and levels with trivially few words.
- **Economy:** constants live at the top of `www/js/game.js` (hint 25 / target 35 / bomb 60, level reward 20, bonus 5, streak 3, golden 10, jar 40, start coins 60). Check a player who never uses bonus words can still afford hints at a sane pace, and that nothing can go negative or be exploited (repeat bonus words, repeat daily claim, reload to re-earn).
- **State and persistence:** quit mid-level and resume; reload after win; clear storage; change the system date/timezone (daily reward must use the local day); fill storage (the `LS` wrapper must not throw).
- **Overlays and navigation:** every overlay opens above the thing that opened it (stacking order is explicit in `style.css`); Android back (`window.FjaleShqip.handleBack()` returns what it did); no dead-end screens.
- **Feedback and clarity:** every tap gets a response; unaffordable hints look disabled; a word with no definition says so instead of doing nothing; toasts stay long enough to read.
- **Accessibility:** `prefers-reduced-motion`, tap targets ≥ 44px, contrast on the gold/red palette, no information carried by color alone.
- **Performance:** 2,389 buttons on the map render once; confirm scrolling and level start are instant on a throttled CPU (Playwright `cdp` CPU throttling ×4).

## Report format

```
## Verdict: SHIP / FIX FIRST / BLOCKED
**Method:** what you actually ran (commands, viewport, levels sampled)
### Bugs (severity P0 crash/data loss/unwinnable · P1 wrong behavior · P2 polish)
1. [P1] <symptom> — repro: <steps> — evidence: <output/screenshot> — cause: <if known>
### Design observations (not bugs)
### Not tested (say so plainly: real devices, iOS, real ads/purchases)
```

## Rules

- **Evidence over assertion.** Never write "works" for something you did not drive. If a tool could not run, say BLOCKED and why.
- **A passing test suite is not a review.** Tests encode what someone already thought of. Your value is the case nobody thought of.
- **When you fix a bug, add a regression test and mutation-check it** (reintroduce the bug, confirm the test fails, restore). A test that has never failed has not been shown to work.
- Do not change level order, word lists, or game balance without the user's decision — present the numbers and a recommendation.
- Do not claim dictionary correctness; that belongs to `albanian-language-reviewer`.
