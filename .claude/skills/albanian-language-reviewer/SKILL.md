---
name: albanian-language-reviewer
description: Review the Albanian vocabulary, spelling, diacritics (ë, ç), digraphs, definitions and word-acceptance rules of Fjalë Shqip. Use this whenever the user mentions Albanian words, the dictionary, "fjalor", the lexicon, definitions/meanings, spelling, ë/ç, whether a word is real, adding words or levels, or asks if the language content is correct — and always before a release. Flags uncertain words instead of guessing; never invents vocabulary or meanings.
---

# albanian-language-reviewer

The player base reads Albanian natively. A wrong word, a missing **ë**, or an invented definition is visible to them immediately and undermines the whole game. The user's standing rule: **use only real Albanian, sourced from a dictionary — never invent vocabulary or meanings.**

## The honesty rule (read first)

The current lexicon (`tools/lexicon.js`, 358 words) and the definitions (`GLOSSES` in `www/js/levels.js`) were written by an AI assistant from its own knowledge. **They have never been checked against a dictionary.** Do not describe them as verified, "per FGJSSH", or "from the dictionary" anywhere — code, README, UI, store text. `npm test` and `npm run audit` fail if such a claim appears.

You may only upgrade a word's status through one of these, and you must say which:
1. A reliable dictionary entry you actually read this session (name the source and the entry).
2. A native speaker's explicit confirmation from the user.

If neither is available, the word stays **unverified** and you say so. "I believe it is correct" is not verification. When unsure about a word, a form, or a meaning: **flag it, do not guess, do not "fix" it from memory.**

## Workflow

1. **Run the automated checks** (they cannot judge meaning, only find what code can find):
   ```bash
   node .claude/skills/albanian-language-reviewer/scripts/lang-check.js
   ```
   It reports letters outside the alphabet (hard error), `ë/e` pairs for a human to confirm, definition hygiene (missing full stop, circular, straight quotes), definition coverage, which undefined words matter most, accepted-vocabulary size, and the digraph question.
2. **Try the dictionary.** `npm run verify:lexicon` queries a public Albanian wiki dictionary and writes `tools/lexicon-review.md`. In restricted sessions it fails (the sites were blocked in earlier sessions; a `migelee-game` environment allows `fjalorishqip.com`, `fjalori.shkenca.org`, `sq.wiktionary.org`). A *found* result is a good sign; a *missing* result only means "needs a human" — inflected forms and rare words often have no page. Never treat either as final.
3. **Prioritize by blast radius.** Words used in many levels matter most — `lang-check` lists them (e.g. `ERA` is in ~370 levels). Review those first, then the "check first" list in `tools/lexicon-review.md`.
4. **Report** every finding with: word, where it is used (count), what looks wrong, why you are unsure, and who/what can settle it.

## What to look for

- **Alphabet:** 36 letters: A B C Ç D **DH** E Ë F G **GJ** H I J K L **LL** M N **NJ** O P Q R **RR** S **SH** T **TH** U V X **XH** Y Z **ZH**. No W. Letters outside this set are errors.
- **ë / ç:** omitting them is the most common error and changes meaning (`ME`/`MË`, `NE`/`NË`, `TE`/`TË`). A word spelled without ë that normally has one is a defect. Pairs that differ only by Ë/E must both be genuinely different words.
- **Forms:** definite vs indefinite (`mal` / `mali`), verb forms (`laj`, `mat`, imperatives), pronouns. Only a dictionary or a native speaker settles whether a given form is a headword the player would recognize — don't assume an inflection is acceptable just because the root is a word.
- **Digraphs are single letters in Albanian.** The game splits them into two tiles (S + H). That is a *design decision*: present it to the user with the trade-offs (single `SH` tile is more authentic, but changes wheel size, generator and every level); do not change it unilaterally.
- **Definitions:** short, in Albanian, natural, not circular, single meaning for the sense used, consistent punctuation and «» quotes. A missing definition is acceptable (the game says so) — a *wrong* one is not. Never fill gaps by writing definitions from memory.
- **Word acceptance:** only 358 words are accepted, while dictionaries hold tens of thousands. Players will type valid words and be told no. That is a known limitation; the fix is a larger *verified* word list, not guessing more words.

## The big accepted-word list (the fix for "valid words get rejected")

Only ~365 words are accepted, so most valid words players type are refused. The engine for a large list exists; **the list itself does not, because no verified source was available.** Pipeline:

1. Obtain a candidate list from a **real source you can name with its license** (e.g. an open Albanian wiki dictionary's headwords, a native speaker's list, or a dictionary whose owner gave permission). Never LLM-generated, never from memory; `wordfreq` has **no Albanian** (it silently falls back to English — do not use it). Check the license is compatible with an app-store app (GPL data is a problem; CC BY-SA needs attribution).
2. `npm run wordlist -- --input <file> --source "<name/URL>" --license "<license>"` — refuses to run without source and license; keeps only plain single Albanian words (alphabet, 2–9 letters, no names/numbers/phrases), writes `www/js/wordlist-sq.js` with provenance and a **review sample** at `tools/wordlist-review-sample.md`.
3. A native speaker reviews the sample (~300 words). **Error rate above ~2% ⇒ do not ship**; fix filters/source and rebuild. Record the outcome with `--review "<who, n, errors>"` and rebuild. `npm run audit:release` blocks a non-empty, unreviewed list.
4. Payout is capped (`BONUS_PAID_CAP`, 10 per level) so a big list can't inflate coins; words beyond the cap are accepted without coins.
5. Players can report missed words via Settings → "Raporto fjalë të munguara" (opens their email app; nothing is sent automatically). Verify each reported word against a dictionary before adding; the privacy policy describes this flow.

## Adding or changing words

1. Add only words you can source (dictionary entry or native speaker). Put the source in your report.
2. Edit `tools/lexicon.js`, run `npm run generate` (regenerates `www/js/levels-gen.js`; level data changes only if the lexicon changes), then `npm run validate` and `npm test`.
3. Never edit `levels-gen.js` by hand. Do not reorder or delete existing levels without the user's decision — saved progress is by level number.
4. After any removal, re-check `GLOSSES` for orphaned entries (a test covers this).

## Report format

```
## Language review
**Verification status:** unverified | partly verified (list what, by what source)
### Defects (confirmed wrong — evidence)
### Needs a native speaker / dictionary (uncertain — NOT changed)
### Coverage and risk (definitions, accepted vocabulary, high-use words)
### Decisions for the user (e.g. digraph tiles)
### What I could not check (and why)
```
