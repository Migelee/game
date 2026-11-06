/* =========================================================================
 * APP_CONFIG — I VETMI vend ku vendosen ID-të e tua para publikimit.
 *
 * Lexohet nga loja (ads.js, game.js) DHE nga tools/configure-native.js,
 * i cili i shkruan App ID-të e AdMob në Info.plist / AndroidManifest.xml.
 * Pas çdo ndryshimi ketu:  npm run ios:sync  /  npm run android:sync
 *
 * Çdo vlerë me "XXXX" është vendmbajtëse — `npm run audit` ta tregon
 * nëse ka mbetur ndonjë para publikimit.
 * ========================================================================= */

const APP_CONFIG = {
  // ⚠️ true = reklama TESTUESE të Google (e sigurt). Kaloje në false
  // vetëm në ndërtimin e publikimit, me ID-të e tua reale më poshtë.
  testMode: true,

  bundleId: "com.fjaleshqip.game", // duhet të përputhet me capacitor.config.json
  version: "1.2.0",

  admob: {
    appId: {
      ios: "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",
      android: "ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ",
    },
    units: {
      ios: {
        banner: "ca-app-pub-XXXXXXXXXXXXXXXX/1111111111",
        interstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/2222222222",
        rewarded: "ca-app-pub-XXXXXXXXXXXXXXXX/3333333333",
      },
      android: {
        banner: "ca-app-pub-XXXXXXXXXXXXXXXX/4444444444",
        interstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/5555555555",
        rewarded: "ca-app-pub-XXXXXXXXXXXXXXXX/6666666666",
      },
    },
  },

  // Blerja "Hiq reklamat" përmes RevenueCat (app.revenuecat.com):
  // krijo një entitlement me këtë ID dhe e lidhe me produktin jo-konsumues
  // në offering-un "current". API key-t i merr te Project → API keys.
  revenuecat: {
    apiKey: { ios: "appl_XXXXXXXXXXXXXXXX", android: "goog_XXXXXXXXXXXXXXXX" },
    entitlement: "remove_ads",
  },

  // URL publik i politikës së privatësisë (GitHub Pages mjafton).
  // Shkruaje edhe në App Store Connect / Play Console.
  privacyUrl: "https://XXXX.example.com/privacy.html",
};

if (typeof module !== "undefined") {
  module.exports = { APP_CONFIG };
}
