---
name: monetization-qa
description: Test and review monetization in Fjalë Shqip — AdMob banner/interstitial/rewarded ads, the "x2 reward", interstitial cooldowns, GDPR/UMP consent and iOS ATT, RevenueCat "Remove Ads" purchase, restore purchases, premium sync, and store/privacy compliance. Use whenever the user mentions ads, AdMob, revenue, IAP, in-app purchase, RevenueCat, coins shop, consent, ATT, "get paid", or wants to enable/disable/launch ads — including the plan to ship v1 without ads and add them later.
---

# monetization-qa

## Current state: **v1 has NO ads and NO purchases**

`features: { ads: false, purchases: false }` in `www/js/config.js`. In that mode:

- The coin chips are plain counters (disabled, no "＋"); the shop, "watch ad", "double reward", "Remove Ads" and "Restore purchases" are hidden.
- `AdManager` is inert: no plugin is requested (`Capacitor.registerPlugin` is never called for `AdMob`/`Purchases`), no ATT prompt, no consent form, no banner/interstitial.
- `@capacitor-community/admob` and `@revenuecat/purchases-capacitor` are **not in package.json**, so they are not linked into the iOS/Android binaries. `tools/configure-native.js` adds no AdMob/ATT keys.
- `www/privacy.html` says no data is collected; `docs/privacy-with-ads.html` is the ready template for later. A test + `npm run audit` fail if the policy, the flags and the installed plugins disagree.

So for v1 the review is: **prove nothing monetization-related is reachable or shipped.**
```bash
npm run -s test:browser     # includes "V1 WEB" and "V1 NATIVE: asnjë plugin reklamash/blerjesh…"
npm run -s audit            # fushëveprimi: reklama OFF, blerje OFF; plugins hequr; Info.plist/manifest pa çelësa
node .claude/skills/capacitor-mobile-qa/scripts/native-qa.js   # linked plugins == expected
```

## Enabling ads/purchases later (v1.1) — all of these change together

1. `npm install @capacitor-community/admob @revenuecat/purchases-capacitor` (versions verified in this repo: admob ^8.3, purchases-capacitor ^14.1; both need Capacitor ≥ 8).
2. `config.js`: set `features.ads` / `features.purchases` to `true`, fill AdMob app IDs + 6 unit IDs and RevenueCat keys, keep `testMode: true` until the release build.
3. Replace `www/privacy.html` with `docs/privacy-with-ads.html` (mentions AdMob/UMP/ATT/RevenueCat) and re-check the date and contact.
4. `npm run ios:sync && npm run android:sync` — adds `GADApplicationIdentifier`, ATT text, SKAdNetwork, Android `APPLICATION_ID`. With `testMode:false` and placeholders the script exits with an error on purpose.
5. In AdMob: enable the GDPR message (Privacy & messaging); host `app-ads.txt` on the developer website. In RevenueCat: an entitlement `remove_ads` attached to the non-consumable product in the *current* offering.
6. Store forms change: App Privacy (tracking/ads), ATT, Data Safety. This is a policy-affecting release — treat it as such.
7. Run the full checks below.

## Checks when ads/purchases are ON

Automated (mock `Capacitor`; proves **our logic**, not the SDKs): `npm run -s test:browser` — startup order (RevenueCat configure → ATT (iOS only) → UMP consent → SDK init → preload with Google *test* IDs), rewarded pays **only on the reward event** (dismiss-without-reward pays nothing; no-fill shows a message), interstitial every 3rd win / never before level 4 / ≥ 90 s apart / never blocks when not ready, banner only on the map and never stuck after a quick exit, purchase success / cancel / restore / refund-sync, "unavailable" message instead of a crash when keys are missing.

Manual on real devices (cannot be automated here):
- Use Google's **test ad units** and a registered test device; never tap your own live ads (AdMob suspends accounts for that).
- Consent: force EEA geography with UMP debug settings and confirm the form appears, the choice is remembered, and ads still load (non-personalized) when declined. iOS: ATT prompt appears once, denial doesn't break anything.
- Purchase: StoreKit sandbox / Google Play license testers — buy, cancel, restore on a second device, refund; premium must follow the store state (startup `syncPremium`).
- Frequency feels fair (no ad before the player has played a few levels; no ad right after a rewarded one); banner never covers controls (map padding is fixed at 92px — verify against the real adaptive height).
- Revenue claims: do not promise income. AdMob pays monthly after a threshold; amounts depend on traffic and region.

## Rules

- **A rewarded ad grants its reward only when the SDK says the user earned it.** Never grant on dismissal, on click, or when the ad failed to show.
- **Never ship `testMode: true` with live IDs, or live IDs with `testMode: true` confusion** — `npm run audit:release` blocks placeholders and test mode when features are on.
- **Privacy policy, store forms, plugins, config and native files must all describe the same app.** If any one disagrees, that is a release blocker (and the audit says so).
- Don't add dark patterns: no fake "ad" buttons, no forced ads in the first levels, no accidental-tap placement. Apple/Google reject them and players leave.
- If you can't test something on a real device or sandbox, say "untested", not "should work".
