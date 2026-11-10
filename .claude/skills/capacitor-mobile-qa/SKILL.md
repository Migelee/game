---
name: capacitor-mobile-qa
description: Review the Capacitor 8 packaging of Fjalë Shqip for iOS and Android — native plugins, Info.plist and AndroidManifest, orientation, safe areas and edge-to-edge, app lifecycle (background, Android back button), WebView pitfalls, service worker, haptics, build and sync problems. Use whenever the user mentions Capacitor, iOS, Android, Xcode, Gradle, cap sync/add, Info.plist, manifest, plugins, native build, device behavior, notch/status bar, or says the app crashes, looks wrong or behaves differently on a phone — and before any native build or store submission.
---

# capacitor-mobile-qa

The game is a plain web app in `www/` (no bundler) wrapped by Capacitor 8. That design has specific failure modes that a browser test cannot see. Your job is to find them statically where possible and to be explicit about what only a device can show.

## Facts about this project that drive the checks

- **No bundler ⇒ plugins are reached via `Capacitor.registerPlugin(name)`** (`www/js/native.js`). `Capacitor.Plugins.X` does *not* exist unless the plugin's own JS ran. Plugin names were verified against the packages: `Haptics`, `InAppReview`, `App` (v1) and `AdMob`, `Purchases` (when ads/purchases are enabled).
- **v1 ships without ads and purchases** (`features` in `www/js/config.js`). The AdMob and RevenueCat packages are *removed from package.json* so they are not linked into the binaries at all. Re-enabling is a deliberate step (see `monetization-qa`).
- **`ios/` and `android/` are generated and gitignored.** `npm run ios:add|sync` and `android:add|sync` run `npx cap …` and then `tools/configure-native.js`, which patches Info.plist / AndroidManifest / strings.xml idempotently (portrait lock, arm64, export compliance; AdMob/ATT keys only when ads are on). It refuses to run for a release with placeholder AdMob IDs.
- **Capacitor 8 defaults `SystemBars.insetsHandling` to `css`.** On Android WebView < 140, `env(safe-area-inset-*)` is **0** and the real values are only in `--safe-area-inset-*`. The CSS therefore uses `--sat/--sab = max(env(), var(--safe-area-inset-*))`. `style: DARK` = light icons on the game's dark red.
- **Service worker is PWA-only.** In the native app it must not register (cache-first with a fixed name would serve stale files after an app update); the code unregisters and clears caches there.
- Needs **Node ≥ 22**. iOS builds need macOS + Xcode; this Linux environment cannot build or run iOS.

## Workflow

1. **Static QA:** `node .claude/skills/capacitor-mobile-qa/scripts/native-qa.js` — compares plugins linked in `android/…/capacitor.plugins.json` and `ios/App/CapApp-SPM/Package.swift` against `package.json`, checks orientation, SystemBars config, `viewport-fit=cover`, background/back-button handling, service-worker policy, `window.open`/`alert`/external URLs, haptics fallback, storage wrapper. Exit 1 on failures.
2. **Regenerate cleanly when in doubt:** `npm run android:sync` / `npm run ios:sync` (idempotent). `npx cap doctor` confirms versions (it saying "Android looking great" does **not** mean an SDK is installed — check `ANDROID_HOME`).
3. **Run the mock-native browser tests:** `npm run -s test:browser` exercises the code paths against a fake `window.Capacitor` (back button, haptics, review, service worker off in native, v1 makes zero ad/purchase calls).
4. **Try the build** where the toolchain exists: `cd android && ./gradlew assembleDebug` (needs Android SDK and access to Google's Maven; in the sandbox `dl.google.com` was blocked and no SDK existed). iOS: open Xcode on a Mac.
5. **Report**, separating *verified statically*, *verified by mock*, and *requires a device*.

## Checklist of device-only risks (list what you could not test)

- Safe areas: notch/Dynamic Island, gesture bar, Android 15/16 edge-to-edge, landscape lock holding on iPad.
- Status-bar legibility (light icons on dark red) on both platforms and both system themes.
- Android back from: level → map → home → exit; with overlays open; during an ad (v2).
- Audio: WebAudio unlock after first touch, iOS silent switch, interruption by calls, music pausing in background.
- Haptics: `Haptics` plugin on iPhone (no `navigator.vibrate` there); sensible intensity.
- Review prompt: system-throttled; must never block or crash.
- Cold start time, memory, and the 2,389-button map on low-end Android.
- Store minimums change: check Apple's required Xcode/SDK and Google Play's target API level at submission time instead of trusting a number in this repo.

## Rules

- Never edit files inside `ios/` or `android/` by hand to "fix" something — change `tools/configure-native.js`, `capacitor.config.json`, or the web code, so the fix survives regeneration (and add a test using the fixtures in `tests/fixtures/`).
- Do not claim "works on iOS/Android" from the browser or mock. Say what was exercised.
- If the user wants ads back, do not just flip the flag: follow `monetization-qa` (plugins, IDs, consent, privacy policy, Info.plist all change together).
