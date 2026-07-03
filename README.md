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

## Monetizimi — si paguhesh nga reklamat

Loja është **falas me reklama** (modeli që sjell më shumë të ardhura për
lojërat e fjalëve) plus blerja **"Hiq reklamat"**. Të gjitha rrjedhat
kalojnë përmes `www/js/ads.js` (`AdManager`), i cili në telefon përdor
**Google AdMob** dhe në shfletues tregon reklama të simuluara për
zhvillim.

### Ku shfaqen reklamat (e zbatuar tashmë në kod)

| Vendi | Lloji | Kur | Pse |
|---|---|---|---|
| Dyqani: "Shiko një reklamë +30 🪙" | Rewarded | kur do lojtari | eCPM-ja më e lartë; me dëshirë |
| Fitorja: "📺 Dyfisho shpërblimin" | Rewarded | pas çdo niveli | vendi më fitimprurës në lojërat e fjalëve |
| Pas niveleve | Interstitial | çdo 3 fitore, kurrë para nivelit 4, ftohje 90 s | të ardhura pasive pa bezdisur |
| Harta e qyteteve | Banner adaptiv | vetëm në atë ekran, kurrë në lojë | të ardhura të vazhdueshme |

Reklamat interstitial + banner **fiken përgjithmonë** me blerjen "Hiq
reklamat"; rewarded mbeten gjithmonë (janë me dëshirë dhe në të mirë të
lojtarit). Interstitial-et dhe rewarded **parangarkohen** që të hapen
pa vonesë, dhe frekuenca respekton politikat e AdMob.

### Hapat për t'u paguar (një herë të vetme, ~1 orë punë)

1. **Krijo llogarinë AdMob** — [admob.google.com](https://admob.google.com)
   me llogarinë Google. Te **Payments** vendos të dhënat bankare dhe ato
   tatimore; Google paguan çdo muaj kur kalon pragun **100 USD** (me
   verifikim adrese me PIN postar herën e parë).
2. **Regjistro aplikacionet** — *Apps → Add app* për iOS dhe Android.
   Merr **App ID**-të (`ca-app-pub-…~…`) dhe vendosi te `CONFIG.appId`
   në `www/js/ads.js`, si dhe në projektet native:
   - iOS `Info.plist`: çelësi `GADApplicationIdentifier`
   - Android `AndroidManifest.xml`: meta-data
     `com.google.android.gms.ads.APPLICATION_ID`
3. **Krijo 6 njësi reklamash** (3 për platformë): *Rewarded*,
   *Interstitial*, *Banner*. Vendos ID-të te `CONFIG.units` në
   `www/js/ads.js` — janë të shënuara me `← ZËVENDËSO`.
4. **Instalo plugin-in** në projektin Capacitor:
   ```bash
   npm install @capacitor-community/admob
   npx cap sync
   ```
5. **Pëlqimi (pa këtë s'paguhesh në BE!)** — te AdMob →
   *Privacy & messaging* aktivizo mesazhin GDPR. Aplikacioni tashmë
   thërret `requestConsentInfo()`/`showConsentForm()` dhe në iOS kërkon
   lejen ATT (shto `NSUserTrackingUsageDescription` në `Info.plist`,
   p.sh. *"Përdoret për reklama më të përshtatshme"*).
6. **app-ads.txt** — publiko në faqen tënde të internetit skedarin që
   të jep AdMob (*Apps → View all apps → app-ads.txt*) dhe vendos të
   njëjtën faqe si "Developer website" në App Store / Play Store.
   Pa të, shumë rrjete s'të japin reklama të paguara.
7. **Përpara publikimit**: te `www/js/ads.js` kalo `TEST_MODE = false`.
   Gjatë zhvillimit lëre `true` (përdor reklamat testuese të Google).
   ⚠️ **Mos i kliko kurrë vetë reklamat reale** — AdMob e mbyll
   llogarinë dhe të ardhurat humbasin.
8. **"Hiq reklamat"** — regjistro produktin jo-konsumues
   `com.fjaleshqip.game.removeads` në App Store Connect / Play Console
   dhe lidhe me një plugin blerjesh (p.sh. RevenueCat);
   `purchaseRemoveAds()`/`restorePurchases()` në `ads.js` i thërrasin
   automatikisht kur ekzistojnë.

Përfitime të tjera që rrisin të ardhurat: **shpërblimi ditor** 🎁 i
kthen lojtarët çdo ditë (më shumë sesione = më shumë reklama), dhe
niveli i lënë përgjysmë **ruhet e vazhdohet** aty ku mbeti.

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
