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
   358 fjalë, të paverifikuara ende me fjalor) si rrotë shkronjash, dhe
   krijon edhe rrota të zgjeruara me 1–2 shkronja shtesë.
2. Gjen të gjitha fjalët e leksikut që formohen nga shkronjat e rrotës.
3. Zgjedh disa variante fjalësh objektiv për rrotë dhe **verifikon me
   gjeneratorin real të fjalëkryqit** se ato vendosen në rrjetë të
   lidhur; fara (seed) që funksionon ruhet në të dhëna dhe përdoret
   njësoj nga loja.
4. Rendit nivelet sipas vështirësisë dhe i ndan në paketa me nga 12.

**Për të shtuar më shumë nivele: shto fjalë të reja te
`tools/lexicon.js`** (kontrollo çdo fjalë të re në fjalor para se ta shtosh!) dhe
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

## Monetizimi

> **VERSIONI 1 del PA reklama dhe PA blerje** (`features: { ads: false, purchases: false }`
> te `www/js/config.js`). Monedhat fitohen vetëm duke luajtur; dyqani është i fshehur;
> AdMob dhe RevenueCat **nuk janë të instaluar** (nuk futen fare në aplikacion); politika
> e privatësisë thotë që nuk mbledhim asnjë të dhënë. Reklamat vijnë në një përditësim të
> mëvonshëm. Kodi është i gatshëm dhe i provuar me teste (mock), por **jo me SDK-të e
> vërteta** — shih më poshtë se si aktivizohen dhe skill-in `monetization-qa`.

### Aktivizimi i reklamave dhe blerjeve (përditësimi pas v1)

1. `npm install @capacitor-community/admob @revenuecat/purchases-capacitor`
2. `www/js/config.js`: `features.ads` / `features.purchases` → `true`; plotëso ID-të (më poshtë).
3. Kopjo `docs/privacy-with-ads.html` mbi `www/privacy.html` (përmend AdMob/ATT/RevenueCat).
4. `npm run ios:sync && npm run android:sync` (shton çelësat AdMob/ATT).
5. `npm run audit` dhe `npm test` duhet të dalin pa bllokues; pastaj provë në pajisje reale.

Pjesa e mëposhtme përshkruan sistemin kur është i aktivizuar.

Loja është **falas me reklama** (modeli që sjell më shumë të ardhura për
lojërat e fjalëve) plus blerja **"Hiq reklamat"**. Të gjitha rrjedhat
kalojnë përmes `www/js/ads.js` (`AdManager`), i cili në telefon përdor
**Google AdMob** dhe në shfletues tregon reklama të simuluara për
zhvillim.

### Ku shfaqen reklamat (kur aktivizohen)

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
   Merr **App ID**-të (`ca-app-pub-…~…`) dhe vendosi te `admob.appId`
   në **`www/js/config.js`**. Skripti `tools/configure-native.js` i
   shkruan vetë në `Info.plist` / `AndroidManifest.xml` / `strings.xml`
   kur ekzekuton `npm run ios:sync` / `android:sync`.
3. **Krijo 6 njësi reklamash** (3 për platformë): *Rewarded*,
   *Interstitial*, *Banner*. Vendos ID-të te `admob.units` në
   `www/js/config.js` (vendmbajtëset kanë `XXXX`).
4. **Plugin-et** janë tashmë te `package.json` (Capacitor 8). Pas çdo
   ndryshimi te `config.js`: `npm run ios:sync` ose `npm run android:sync`.
5. **Pëlqimi (pa këtë s'paguhesh në BE!)** — te AdMob →
   *Privacy & messaging* aktivizo mesazhin GDPR. Aplikacioni thërret
   vetë `requestConsentInfo()`/`showConsentForm()` dhe në iOS kërkon
   lejen ATT; teksti i lejes shtohet automatikisht nga
   `configure-native.js`.
6. **app-ads.txt** — publiko në faqen tënde të internetit skedarin që
   të jep AdMob (*Apps → View all apps → app-ads.txt*) dhe vendos të
   njëjtën faqe si "Developer website" në App Store / Play Store.
   Pa të, shumë rrjete s'të japin reklama të paguara.
7. **Përpara publikimit**: te `www/js/config.js` kalo `testMode: false`
   dhe plotëso ID-të reale (me `testMode:false` dhe ID vendmbajtëse,
   `configure-native.js` ndalet me gabim). Gjatë zhvillimit lëre `true`
   (reklamat testuese të Google). Kontrolli: `npm run audit:release`.
   ⚠️ **Mos i kliko kurrë vetë reklamat reale** — AdMob e mbyll
   llogarinë dhe të ardhurat humbasin.
8. **"Hiq reklamat" (RevenueCat)** — krijo llogari te
   [app.revenuecat.com](https://app.revenuecat.com), shto aplikacionet
   iOS/Android, krijo produktin jo-konsumues në App Store Connect /
   Play Console, lidhe me një *entitlement* me ID `remove_ads` dhe vëre
   atë produkt në offering-un "current". Kopjo API key-t te
   `revenuecat.apiKey` në `config.js`. Pa to, butoni shfaq "Blerja
   s'është gati" (nuk rrëzohet). Gjendja e premium sinkronizohet me
   dyqanin në çdo nisje (kap edhe rimbursimet).

Përfitime të tjera që rrisin të ardhurat: **shpërblimi ditor** 🎁 i
kthen lojtarët çdo ditë (më shumë sesione = më shumë reklama), dhe
niveli i lënë përgjysmë **ruhet e vazhdohet** aty ku mbeti.

## Burimi i fjalëve

**Statusi:** fjalët dhe shpjegimet u përpiluan nga një asistent AI nga njohuritë e tij të gjuhës shqipe. **Nuk janë verifikuar ende me fjalor.** Para publikimit duhet t'i kontrollojë një folës shqip ose një fjalor i besueshëm (p.sh. fjalorishqip.com, fjalori.shkenca.org). Lista e fjalëve që duhen parë së pari është te `tools/lexicon-review.md`; vegla `tools/verify-lexicon.js` ndihmon me kontrollin kur ka qasje në internet.

Lista e niveleve gjendet te `www/js/levels.js`; fjalët pa shpjegim shfaqin në lojë "Shpjegimi i kësaj fjale nuk është shtuar ende".

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

Loja është edhe **PWA** — punon offline në shfletues. Në aplikacionin
native service worker çaktivizohet (skedarët janë të ngjitur) që të mos
shërbehen skedarë të vjetër pas përditësimeve.

## Skills (asistenti i projektit)

Në `.claude/skills/` ka pesë skills që Claude Code i përdor automatikisht kur ke nevojë:

| Skill | Për çfarë | Mjeti |
|---|---|---|
| `game-reviewer` | rishikim si QA i lojërave: lojë me zvarritje reale, vështirësia, ekonomia, gabime | `scripts/playtest.js` |
| `albanian-language-reviewer` | fjalët, ë/ç, digrafët, shpjegimet; **pa shpikur kurrë fjalë** | `scripts/lang-check.js` |
| `capacitor-mobile-qa` | Capacitor 8, iOS/Android, plugin-et e lidhura, zonat e sigurta, cikli i jetës | `scripts/native-qa.js` |
| `monetization-qa` | reklama, pëlqimi, blerjet, rrugëzgjidhja për t'i aktivizuar | testet native-mock |
| `release-engineer` | portat e publikimit, asetet, dyqanet, lista e asaj që mbetet | `scripts/preflight.js` |

`node .claude/skills/release-engineer/scripts/preflight.js` ekzekuton të gjitha portat automatike.

## Testet

```bash
npm test               # të dhëna, vegla, konfigurim native, privatësi, plugin-e (21 teste)
npm run test:browser   # shfletues i vërtetë me Playwright: lojë, reklama, blerje, back, v1 (24 teste)
npm run validate       # të 2 389 nivelet
npm run audit          # gatishmëria për publikim; `audit:release` bllokon vendmbajtëset
npm run analyze        # kurba e vështirësisë dhe rrotat e përsëritura
```

Testet NATIVE-MOCK përdorin një `window.Capacitor` të simuluar për të
provuar kodin tonë (radhën e thirrjeve, parametrat, shpërblimet). **Nuk
provojnë** SDK-të e vërteta, iOS, as reklama ose blerje reale — këto
duhen provuar në pajisje.

## Ndërtimi native (Capacitor 8)

```bash
npm install
npm run assets       # ikona + splash (assets/*.png → ios/ dhe android/)
npm run ios:add      # krijon projektin Xcode dhe e përshtat (kërkon macOS + Xcode)
npm run ios:open     # hap Xcode
npm run android:add  # krijon projektin Android dhe e përshtat
```

`ios:*` dhe `android:*` ekzekutojnë automatikisht `tools/configure-native.js`
(ID e AdMob, tekstin ATT, vetëm portret, arm64, kodimi). Projektet `ios/`
dhe `android/` janë të gjeneruara dhe nuk futen në git.

Pastaj në Xcode: zgjidh ekipin te *Signing & Capabilities* →
*Product → Archive* → ngarko në **App Store Connect**.

### Lista përfundimtare para publikimit

- [ ] `npm run audit:release` pa bllokues (v1: reklamat/blerjet OFF, s'ka çelësa për t'u plotësuar).
- [ ] Konfirmo **bundle ID** (`com.fjaleshqip.game` është i përkohshëm) dhe
      emrin e aplikacionit te App Store Connect (disponueshmëria kontrollohet
      vetëm atje). Ndryshimi: `capacitor.config.json` + `config.js`.
- [ ] Aktivizo GitHub Pages (Settings → Pages → Source: GitHub Actions) që
      `privacyUrl` të hapet publikisht; shkruaje te dyqanet.
- [ ] **Fjalët:** një folës shqip duhet të rishikojë `tools/lexicon-review.md`.
- [ ] Provo në pajisje reale: back button (Android), zonat e sigurta
      (notch/edge-to-edge), dridhjet, audio, kthimi nga sfondi.
- [ ] Pamjet e ekranit për App Store: 6.7", 6.5" dhe 5.5" (iPhone),
      12.9" (iPad).

## Struktura

```
www/                  aplikacioni web (webDir i Capacitor)
  index.html          UI kryesore (3 ekrane + dritaret)
  css/style.css       stilet me ngjyrat e flamurit shqiptar
  js/levels.js        66 nivelet e historisë, fjalët bonus, shpjegimet
  js/levels-gen.js    2 323 nivelet e gjeneruara (mos e edito me dorë)
  js/crossword.js     gjeneratori determinist i rrjetës së fjalëkryqit
  js/config.js        ID-të e AdMob/RevenueCat, testMode, URL-ja e privatësisë
  js/native.js        ura drejt plugin-eve të Capacitor (haptics, back, review)
  js/ads.js           AdManager: reklamat (AdMob/simulim) dhe blerja (RevenueCat)
  js/game.js          logjika e lojës (rrota, rrjeta, monedhat, ndihmat)
  sw.js               service worker (offline)
tools/lexicon.js      leksiku shqip (358 fjalë, PA verifikuar ende)
tools/generate-levels.js  vegla që prodhon mijëra nivele nga leksiku
tools/validate.js     verifikon TË GJITHA nivelet dhe rrjetat
tools/configure-native.js  përshtat Info.plist/AndroidManifest (ID, ATT, portret)
tools/make-assets.js  prodhon ikonën dhe splash-in PNG
tools/audit.js        kontroll gatishmërie për publikim
tools/analyze-levels.js   kurba e vështirësisë dhe rrotat e përsëritura
tools/verify-lexicon.js   ndihmon kontrollin e leksikut me fjalor + tools/lexicon-review.md
tests/                teste automatike (node:test + Playwright)
assets/               ikona dhe splash burim (PNG)
capacitor.config.json konfigurimi për iOS/Android
```
