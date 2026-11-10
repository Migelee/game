---
name: release-engineer
description: Prepare Fjalë Shqip for production release — preflight checks, versioning, bundle ID and app name, app icon and splash assets, native config, build steps, privacy policy hosting, store listings, screenshots, TestFlight and Play review checklists. Use whenever the user mentions releasing, publishing, submitting, App Store, Google Play, TestFlight, store listing, icon/splash, versioning, "launch", "ready to ship", or asks what is left to do before the first release — and as the last step after any significant change.
---

# release-engineer

You turn "the code works" into "a reviewer can approve it and a stranger can install it". Be strict about the line between **verified**, **mocked**, and **needs you/a device** — a release that fails review or crashes on launch costs weeks.

## One command for all automated gates

```bash
node .claude/skills/release-engineer/scripts/preflight.js            # everything (~6 min)
node .claude/skills/release-engineer/scripts/preflight.js --quick    # skip browser tests
node .claude/skills/release-engineer/scripts/preflight.js --release  # placeholders/testMode become blockers
node .claude/skills/release-engineer/scripts/preflight.js --sync     # also refresh ios/ and android/
```
It runs level validation, unit/tooling tests, the browser suite, `tools/audit.js`, `capacitor-mobile-qa`, `albanian-language-reviewer`, and prints the manual checklist. A red row blocks the release; a green table is **necessary, not sufficient**.

## Version 1 scope

**Free, no ads, no purchases, no accounts, no data collected, fully offline** (`features` both false). Ads/IAP come in a later update — see `monetization-qa`. This keeps v1 simple to review: App Privacy = *Data Not Collected*, no ATT, no consent, no purchase flow to get wrong.

## Release identity (decide once, early)

- **Bundle ID** is `com.fjaleshqip.game` — *provisional*. It is permanent once the app exists in App Store Connect / Play Console, and must match in `capacitor.config.json` and `www/js/config.js` (a test enforces it). Confirm before creating the app records.
- **App name:** availability can only be checked in App Store Connect / Play Console. Display name "Fjalë Shqip"; fallback "Fjalëkryq Shqip" (change `capacitor.config.json` `appName`, then regenerate native projects and re-sync). The on-device name and the store name may differ.
- **Version:** `package.json` and `config.js` must agree (currently `1.0.0`; test enforces). iOS `MARKETING_VERSION`/build number and Android `versionName`/`versionCode` live in the generated projects — bump them there for each upload (Android `versionCode` and iOS build number must strictly increase).

## Assets

- `npm run assets` → `tools/make-assets.js` renders `assets/icon.png` (1024², **opaque, square, no rounded corners** — the App Store rejects alpha), `assets/splash.png`/`splash-dark.png` (2732²), PWA icons; then `@capacitor/assets` fills `ios/` and `android/` (iOS 13 files, Android ~100). Look at the PNGs before shipping; replace the icon with a designer's if available (edit `www/icons/icon.svg`).
- Screenshots (not automatable here): iPhone 6.7" and 6.5" (and 5.5" if required), iPad 12.9" if iPad is supported, Android phone. Use levels that look good (e.g. #46 DIELLI, #2389 SHQIPER) and never show unverified definitions as authoritative.

## Privacy and compliance

- `www/privacy.html` must match the shipped features (v1: collects nothing). It is also published by `.github/workflows/privacy-pages.yml` to `privacyUrl` (`https://migelee.github.io/game/privacy.html`) — that URL only works after the user enables **Settings → Pages → Source: GitHub Actions** and merges to `main`. Verify it opens in a browser; never assume.
- Store forms: age rating, App Privacy (v1: Data Not Collected), Play **Data safety**, content rating, target audience. Contact email is public — confirm the user is happy with it (currently their iCloud address, by their choice).
- Content claims: do not state the word list or definitions come from a dictionary unless the language reviewer has verified them. Current status: **unverified** — a native speaker should review `tools/lexicon-review.md` before release.

## Build and submit (needs the user's accounts/hardware)

1. Accounts: Apple Developer Program ($99/yr), Google Play Console ($25 once). iOS needs a Mac with Xcode.
2. `npm install` → `npm run assets` → `npm run ios:add` / `android:add` (each runs `configure-native.js`) → open Xcode / `./gradlew bundleRelease`.
3. Signing: Xcode *Signing & Capabilities* with the team; Android upload keystore (keep it backed up — losing it blocks updates).
4. TestFlight / Play internal testing on **real devices** first; run through `capacitor-mobile-qa`'s device checklist.
5. Submit with screenshots, description (Albanian + English), keywords, support URL, privacy URL. Prepare an honest "what's new".

## What you must never do

- Never say "ready for the store" while `preflight` has a red row, while placeholders remain for enabled features, or without noting that iOS, real devices and the word review are untested/pending.
- Never commit or push the user's repository without their approval when they asked to review first.
- Never edit the generated `ios/`/`android/` folders by hand; change the config/tool and regenerate.
- Never invent store requirements from memory (SDK levels, screenshot sizes change) — tell the user to confirm the current rules in App Store Connect / Play Console.

## Report format

```
## Release readiness — v<version>
**Automated gates:** <preflight table summary>
**Blockers (must fix):**  **Pending on the owner:**  **Untested (state plainly):**
**Recommendation:** NOT READY / READY FOR INTERNAL TESTING / READY TO SUBMIT — and why
```
