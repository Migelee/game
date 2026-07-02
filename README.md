# Fjalë Shqip 🇦🇱

**Fjalë Shqip** është një lojë fjalëkryqi në stilin e *Words of Wonders*, tërësisht në gjuhën shqipe dhe me temë Shqipërinë.

## Si luhet

- Në fund të ekranit është **rrota e shkronjave**.
- **Lidh shkronjat** me gisht (ose me mi) për të formuar një fjalë shqipe.
- Fjalët e sakta mbushin **rrjetën e fjalëkryqit** sipër.
- Fjalë të tjera të vlefshme shqipe që nuk janë në rrjetë japin **monedha bonus** ✨.
- Me monedha mund të blesh **ndihma** 💡 që zbulojnë një shkronjë.
- Prek një fjalë të gjetur në rrjetë për të parë **kuptimin e saj** sipas fjalorit.

## Nivelet — nga më i lehti te më i vështiri

30 nivele të ndara në 5 qytete/vende historike shqiptare, me vështirësi në rritje:

| Paketa | Vështirësia | Shkronja |
|---|---|---|
| Butrinti | Fillestar | 3–4 |
| Shkodra | I lehtë | 4 |
| Berati | Mesatar | 4–5 |
| Vlora | I vështirë | 5–6 |
| Gjirokastra | Mjeshtër | 5–6 (deri në 10 fjalë për nivel) |

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
  js/levels.js        30 nivelet, fjalët bonus, shpjegimet nga fjalori
  js/crossword.js     gjeneratori determinist i rrjetës së fjalëkryqit
  js/game.js          logjika e lojës (rrota, rrjeta, monedhat, ndihmat)
  sw.js               service worker (offline)
tools/validate.js     verifikon nivelet dhe gjenerimin e rrjetave
capacitor.config.json konfigurimi për iOS/Android
```
