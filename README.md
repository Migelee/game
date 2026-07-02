# Fjalë Shqip 🇦🇱

**Fjalë Shqip** është një lojë fjalëkryqi në stilin e *Words of Wonders*, tërësisht në gjuhën shqipe dhe me temë Shqipërinë.

## Si luhet

- Në fund të ekranit është **rrota e shkronjave**.
- **Lidh shkronjat** me gisht (ose me mi) për të formuar një fjalë shqipe —
  shkronjat fluturojnë drejt rrjetës kur fjala është e saktë.
- Fjalët e sakta mbushin **rrjetën e fjalëkryqit** sipër.
- Fjalë të tjera të vlefshme shqipe që nuk janë në rrjetë japin **monedha
  bonus** ✨ dhe një **yll për kavanozin** ⭐ — mbush 10 yje dhe fiton +40 🪙.
- Gjetjet radhazi pa gabime ndezin **serinë** 🔥 që jep monedha shtesë.
- Tri lloje ndihmash: 💡 zbulon një shkronjë të rastit (25 🪙),
  🎯 zbulon qelizën që zgjedh vetë (35 🪙), 💣 zbulon tri shkronja (60 🪙).
- Çdo nivel vlerësohet me **1–3 yje** ★ sipas ndihmave e gabimeve.
- Prek një fjalë të gjetur në rrjetë për të parë **kuptimin e saj** sipas fjalorit.
- Tinguj të sintetizuar (pa skedarë audio) dhe dridhje — çelësi 🔊 i fik.

## Nivelet — nga më i lehti te më i vështiri

**2 389 nivele gjithsej**: 66 nivele "historie" të punuara me dorë në 11
qytete, plus **2 323 nivele të gjeneruara** në 194 paketa me emra vendesh
shqiptare (Valbona, Thethi, Vjosa, Ksamili…), të renditura nga më të
lehtat te më të vështirat.

### Vegla e gjenerimit të niveleve

```bash
node tools/generate-levels.js   # prodhon www/js/levels-gen.js
node tools/validate.js          # verifikon TË GJITHA nivelet
```

Si punon gjeneratori (`tools/generate-levels.js`):

1. Merr çdo fjalë 4–7 shkronjash nga **leksiku** (`tools/lexicon.js`,
   ~400 fjalë të verifikuara sipas FGJSSH) si rrotë shkronjash, dhe
   krijon edhe rrota të zgjeruara me 1–2 shkronja shtesë.
2. Gjen të gjitha fjalët e leksikut që formohen nga shkronjat e rrotës.
3. Zgjedh disa variante fjalësh objektiv për rrotë dhe **verifikon me
   gjeneratorin real të fjalëkryqit** se ato vendosen në rrjetë të
   lidhur; fara (seed) që funksionon ruhet në të dhëna dhe përdoret
   njësoj nga loja.
4. Rendit nivelet sipas vështirësisë dhe i ndan në paketa me nga 12.

**Për të shtuar më shumë nivele: shto fjalë të reja te
`tools/lexicon.js`** (vetëm fjalë të verifikuara në fjalor!) dhe
rigjenero — çdo fjalë e re shumëfishon kombinacionet. Çdo fjalë e
leksikut njihet edhe si **fjalë bonus** gjatë lojës.

Paketat e historisë (me shpjegime fjalori për çdo fjalë):

| Paketa | Vështirësia | Shkronja |
|---|---|---|
| 🏛️ Butrinti | Fillestar | 3–4 |
| 🏰 Shkodra | I lehtë | 4 |
| ⚔️ Kruja | Nxënës | 4 |
| 🏖️ Saranda | Zbulues | 4–5 |
| 🏔️ Tropoja | Malësor | 4–5 |
| 🏘️ Berati | Mesatar | 4–5 |
| ⚓ Durrësi | I përparuar | 5 |
| 🌊 Vlora | I vështirë | 5–6 |
| 🎻 Korça | Ekspert | 5–6 |
| 🪨 Gjirokastra | Mjeshtër | 5–6 (deri në 10 fjalë për nivel) |
| 🏙️ Tirana | Legjendar | 5–7, mbyllet me ATDHEU (11 fjalë) |

## Monetizimi — falas me reklama (dhe "Hiq reklamat")

Loja përdor modelin **free-to-play me reklama**, jo çmim blerjeje — për
lojërat e fjalëve ky model sjell shumëfish më tepër shkarkime dhe të
ardhura se një aplikacion me pagesë, sidomos për një treg gjuhësor të
vogël. Tri burime:

1. **Reklama me shpërblim** 📺 — lojtari zgjedh vetë t'i shohë në
   Dyqan (prek çipin 🪙 ＋) dhe fiton +30 monedha.
2. **Reklama të plota** — pas çdo 3 nivelesh të fituara, kurrë para
   nivelit 4 dhe kurrë për lojtarët premium.
3. **"Hiq reklamat"** 🚫 — blerje një herë (IAP) që i fik të gjitha.

Gjithçka kalon përmes `www/js/ads.js` (`AdManager`):

- **Në shfletues / gjatë zhvillimit** shfaqet një reklamë e simuluar me
  numërim mbrapsht, kështu që gjithë rrjedha testohet pa SDK.
- **Në telefon (Capacitor)** përdoret **Google AdMob** përmes
  [`@capacitor-community/admob`](https://github.com/capacitor-community/admob).
  ID-të në `CONFIG` janë ID-të **testuese** zyrtare të Google —
  zëvendësoji me ID-të e aplikacionit tënd nga [admob.google.com](https://admob.google.com)
  para publikimit, dhe shto `GADApplicationIdentifier` në `Info.plist` (iOS)
  a `com.google.android.gms.ads.APPLICATION_ID` në `AndroidManifest.xml`.
- Për blerjen "Hiq reklamat" regjistro produktin
  `com.fjaleshqip.game.removeads` në App Store Connect / Play Console
  dhe lidhe me një plugin blerjesh (p.sh. RevenueCat ose
  `cordova-plugin-purchase`); `AdManager.purchaseRemoveAds()` e thërret
  atë kur ekziston.

Përfitime të tjera ditore: **shpërblimi ditor** 🎁 me seri (10–30 🪙)
i kthen lojtarët çdo ditë, dhe niveli i lënë përgjysmë **ruhet e
vazhdohet** aty ku mbeti.

## Burimi i fjalëve

Të gjitha fjalët dhe shpjegimet e tyre janë fjalë standarde të gjuhës shqipe,
të verifikuara sipas **Fjalorit të Gjuhës së Sotme Shqipe (FGJSSH)** —
burime: [fjalorishqip.com](https://fjalorishqip.com) dhe fjalori.shkenca.org.
Lista e niveleve gjendet te `www/js/levels.js`; për çdo fjalë ka një shpjegim
të shkurtër te `GLOSSES`.

Për të shtuar nivele të reja, shto një objekt `{ letters, words }` te `PACKS`
dhe verifiko me:

```bash
npm run validate
```

## Nisja lokale (shfletues)

```bash
npx serve www
# hap http://localhost:3000
```

Loja është edhe **PWA** — punon offline dhe mund të instalohet nga shfletuesi.

## Publikimi në App Store (iOS me Capacitor)

Loja është e gatshme për t'u paketuar me [Capacitor](https://capacitorjs.com):

```bash
npm install
npm run ios:add      # krijon projektin Xcode (kërkon macOS + Xcode)
npm run ios:sync     # kopjon www/ në projektin iOS
npm run ios:open     # hap Xcode
```

Pastaj në Xcode:

1. Zgjidh ekipin e zhvillimit (Apple Developer account) te *Signing & Capabilities*.
2. Gjenero ikonat e aplikacionit nga `www/icons/icon.svg` (p.sh. me [appicon.co](https://www.appicon.co)) dhe vendosi te `Assets.xcassets`.
3. *Product → Archive* dhe ngarko në **App Store Connect**.

Për Android (Google Play): `npm run android:add && npm run android:sync`.

### Lista përfundimtare para publikimit

- [ ] Zëvendëso ID-të testuese të AdMob te `www/js/ads.js` me ID-të e tua
      dhe shto App ID-në e AdMob në `Info.plist` / `AndroidManifest.xml`.
- [ ] **iOS — ATT:** shto `NSUserTrackingUsageDescription` në `Info.plist`
      dhe integro *User Messaging Platform* (UMP) të Google për pëlqimin
      e reklamave (GDPR/ATT) — kërkohet nga Apple dhe BE-ja.
- [ ] Regjistro produktin IAP `com.fjaleshqip.game.removeads`
      (jo-konsumues) në App Store Connect / Play Console dhe lidhe me një
      plugin blerjesh; butonat **Blerje** dhe **Rikthe blerjet** tashmë
      thërrasin `AdManager.purchaseRemoveAds()` / `restorePurchases()`.
- [ ] Lidh butonin «Vlerëso aplikacionin» me `SKStoreReviewController`
      (p.sh. plugin `@capacitor-community/in-app-review`).
- [ ] Politika e privatësisë (`www/privacy.html`) është gati — vendose
      edhe në një URL publike dhe shënoje në App Store Connect.
- [ ] Gjenero ikonat + ekranet e nisjes me `npx @capacitor/assets generate`.
- [ ] Pamjet e ekranit për App Store: 6.7", 6.5" dhe 5.5" (iPhone),
      12.9" (iPad) — luaj nivelet me rrjeta të bukura (p.sh. 46, 66).

## Struktura

```
www/                  aplikacioni web (webDir i Capacitor)
  index.html          UI kryesore (3 ekrane + dritaret)
  css/style.css       stilet me ngjyrat e flamurit shqiptar
  js/levels.js        66 nivelet e historisë, fjalët bonus, shpjegimet
  js/levels-gen.js    2 323 nivelet e gjeneruara (mos e edito me dorë)
  js/crossword.js     gjeneratori determinist i rrjetës së fjalëkryqit
  js/ads.js           AdManager: reklamat (AdMob/simulim) dhe IAP
  js/game.js          logjika e lojës (rrota, rrjeta, monedhat, ndihmat)
  sw.js               service worker (offline)
tools/lexicon.js      leksiku shqip (~400 fjalë të verifikuara, FGJSSH)
tools/generate-levels.js  vegla që prodhon mijëra nivele nga leksiku
tools/validate.js     verifikon TË GJITHA nivelet dhe rrjetat
capacitor.config.json konfigurimi për iOS/Android
```
