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

66 nivele të ndara në 11 qytete/vende historike shqiptare, me vështirësi në rritje:

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

## Struktura

```
www/                  aplikacioni web (webDir i Capacitor)
  index.html          UI kryesore (3 ekrane + dritaret)
  css/style.css       stilet me ngjyrat e flamurit shqiptar
  js/levels.js        66 nivelet, fjalët bonus, shpjegimet nga fjalori
  js/crossword.js     gjeneratori determinist i rrjetës së fjalëkryqit
  js/ads.js           AdManager: reklamat (AdMob/simulim) dhe IAP
  js/game.js          logjika e lojës (rrota, rrjeta, monedhat, ndihmat)
  sw.js               service worker (offline)
tools/validate.js     verifikon nivelet dhe gjenerimin e rrjetave
capacitor.config.json konfigurimi për iOS/Android
```
