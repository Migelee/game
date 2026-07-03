/* =========================================================================
 * AdManager — reklamat dhe blerjet (të ardhurat e lojës)
 *
 * TRE vende reklamash, të balancuara për të ardhura maksimale pa e
 * prishur përvojën:
 *
 *  1. REWARDED (me shpërblim) — eCPM më i lartë; lojtari zgjedh vetë:
 *     • Dyqani: +30 monedha
 *     • Ekrani i fitores: "Dyfisho shpërblimin" (x2 monedhat e nivelit)
 *  2. INTERSTITIAL (e plotë) — pas çdo 3 nivelesh të fituara, kurrë para
 *     nivelit 4, me ftohje minimale 90 sekonda (politikat e AdMob).
 *  3. BANNER (shirit adaptiv) — vetëm në ekranin e hartës së qyteteve,
 *     kurrë gjatë lojës.
 *
 * "Hiq reklamat" (IAP) i fik 2 dhe 3; rewarded mbetet gjithmonë me dëshirë.
 *
 * NË TELEFON: Google AdMob përmes @capacitor-community/admob v6+,
 * me pëlqimin GDPR (UMP) dhe ATT të iOS të trajtuara në init().
 * NË SHFLETUES: reklama të simuluara që sillen njësoj — për zhvillim.
 *
 * ▼▼▼ PARA PUBLIKIMIT: vendos ID-të e TUA nga admob.google.com dhe
 *     kalo TEST_MODE në false. Mos i kliko kurrë vetë reklamat reale!
 * ========================================================================= */

const AdManager = (function () {
  "use strict";

  /* =====================================================================
   * KONFIGURIMI — I VETMI VEND QË DUHET PREKUR PARA PUBLIKIMIT
   * ===================================================================== */
  const TEST_MODE = true; // ← kaloje në false vetëm me ID-të e tua reale!

  const CONFIG = {
    // App ID-të e AdMob (duhen edhe në Info.plist / AndroidManifest.xml)
    appId: {
      ios: "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",     // ← ZËVENDËSO
      android: "ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ", // ← ZËVENDËSO
    },
    // Njësitë e reklamave — krijoji te admob.google.com → Apps → Ad units
    units: {
      ios: {
        banner: "ca-app-pub-XXXXXXXXXXXXXXXX/1111111111",       // ← ZËVENDËSO
        interstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/2222222222", // ← ZËVENDËSO
        rewarded: "ca-app-pub-XXXXXXXXXXXXXXXX/3333333333",     // ← ZËVENDËSO
      },
      android: {
        banner: "ca-app-pub-XXXXXXXXXXXXXXXX/4444444444",       // ← ZËVENDËSO
        interstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/5555555555", // ← ZËVENDËSO
        rewarded: "ca-app-pub-XXXXXXXXXXXXXXXX/6666666666",     // ← ZËVENDËSO
      },
    },
  };

  /* ID-të zyrtare TESTUESE të Google — përdoren sa kohë TEST_MODE=true.
   * Me këto mund të klikosh lirisht; me ID-të reale KURRË. */
  const TEST_UNITS = {
    ios: {
      banner: "ca-app-pub-3940256099942544/2934735716",
      interstitial: "ca-app-pub-3940256099942544/4411468910",
      rewarded: "ca-app-pub-3940256099942544/1712485313",
    },
    android: {
      banner: "ca-app-pub-3940256099942544/6300978111",
      interstitial: "ca-app-pub-3940256099942544/1033173712",
      rewarded: "ca-app-pub-3940256099942544/5224354917",
    },
  };

  const SIM_REWARDED_SECONDS = 5;
  const SIM_INTERSTITIAL_SECONDS = 3;

  /* ===================================================================== */

  function nativeAdMob() {
    const cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.AdMob) {
      return cap.Plugins.AdMob;
    }
    return null;
  }

  function unitIds() {
    const cap = window.Capacitor;
    const p = cap && cap.getPlatform ? cap.getPlatform() : "web";
    const table = TEST_MODE ? TEST_UNITS : CONFIG.units;
    return p === "ios" ? table.ios : table.android;
  }

  let initialized = false;
  let interstitialReady = false;
  let rewardedReady = false;

  /* ---------- Nisja: pëlqimi (UMP/GDPR + ATT) dhe parangarkimi ---------- */
  async function init() {
    const admob = nativeAdMob();
    if (!admob || initialized) return;
    try {
      // 1. iOS App Tracking Transparency — kërkohet nga Apple
      if (admob.requestTrackingAuthorization) {
        try { await admob.requestTrackingAuthorization(); } catch (e) { /* vazhdo */ }
      }
      // 2. Pëlqimi GDPR përmes User Messaging Platform të Google —
      //    pa këtë NUK paguhesh për përdoruesit e BE-së.
      //    (Mesazhi konfigurohet te AdMob → Privacy & messaging.)
      if (admob.requestConsentInfo) {
        try {
          const info = await admob.requestConsentInfo({});
          if (info && info.isConsentFormAvailable && info.status === "REQUIRED" && admob.showConsentForm) {
            await admob.showConsentForm();
          }
        } catch (e) { /* vazhdo me reklama të papersonalizuara */ }
      }
      // 3. Nis SDK-në
      await admob.initialize({ initializeForTesting: TEST_MODE });
      initialized = true;
      // 4. Parangarko që reklamat të shfaqen PA vonesë kur duhen
      preloadInterstitial();
      preloadRewarded();
    } catch (e) { /* loja vazhdon pa reklama native */ }
  }

  async function preloadInterstitial() {
    const admob = nativeAdMob();
    if (!admob || !initialized) return;
    try {
      await admob.prepareInterstitial({ adId: unitIds().interstitial });
      interstitialReady = true;
    } catch (e) { interstitialReady = false; }
  }

  async function preloadRewarded() {
    const admob = nativeAdMob();
    if (!admob || !initialized) return;
    try {
      await admob.prepareRewardVideoAd({ adId: unitIds().rewarded });
      rewardedReady = true;
    } catch (e) { rewardedReady = false; }
  }

  /* ---------- Reklama e simuluar (shfletues / zhvillim) ---------- */
  const HOUSE_SLIDES = [
    ["SHQIPONJA", "Zogu madhështor i maleve tona — simboli i flamurit."],
    ["BESA", "Fjala e dhënë që s'thyhet kurrë — krenaria shqiptare."],
    ["MËSO SHQIP", "Çdo nivel të mëson fjalë të reja nga fjalori."],
    ["ATDHEU", "Nga Vermoshi në Konispol — luaj nëpër gjithë Shqipërinë."],
  ];

  function showSimulated(kind, seconds, onFinish) {
    const overlay = document.getElementById("overlay-ad");
    const titleEl = document.getElementById("ad-title");
    const bodyEl = document.getElementById("ad-body");
    const countEl = document.getElementById("ad-count");
    const closeBtn = document.getElementById("btn-ad-close");
    const slide = HOUSE_SLIDES[Math.floor(Math.random() * HOUSE_SLIDES.length)];

    titleEl.textContent = slide[0];
    bodyEl.textContent = slide[1];
    overlay.classList.add("show");
    closeBtn.disabled = true;
    closeBtn.textContent = "…";

    let left = seconds;
    countEl.textContent = left;
    const timer = setInterval(() => {
      left--;
      countEl.textContent = left > 0 ? left : "";
      if (left <= 0) {
        clearInterval(timer);
        closeBtn.disabled = false;
        closeBtn.textContent = kind === "rewarded" ? "Merr shpërblimin ✓" : "Vazhdo ›";
      }
    }, 1000);

    closeBtn.onclick = () => {
      if (closeBtn.disabled) return;
      overlay.classList.remove("show");
      closeBtn.onclick = null;
      onFinish();
    };
  }

  /* ---------- REWARDED: thirr onReward() VETËM po u pa deri në fund ---------- */
  async function showRewarded(onReward, onUnavailable) {
    const admob = nativeAdMob();
    if (admob) {
      if (!initialized) await init();
      if (!rewardedReady) {
        preloadRewarded(); // bëje gati për herën tjetër
        if (onUnavailable) onUnavailable();
        return;
      }
      try {
        let gotReward = false;
        const rewardL = await admob.addListener("onRewardedVideoAdReward", () => { gotReward = true; });
        const dismissL = await admob.addListener("onRewardedVideoAdDismissed", () => {
          rewardL.remove();
          dismissL.remove();
          rewardedReady = false;
          preloadRewarded();
          if (gotReward) onReward();
        });
        await admob.showRewardVideoAd();
      } catch (e) {
        rewardedReady = false;
        preloadRewarded();
        if (onUnavailable) onUnavailable();
      }
      return;
    }
    showSimulated("rewarded", SIM_REWARDED_SECONDS, onReward);
  }

  /* ---------- INTERSTITIAL: thirr onDone() kur mbyllet ---------- */
  async function showInterstitial(onDone) {
    const admob = nativeAdMob();
    if (admob) {
      if (!initialized) await init();
      if (!interstitialReady) {
        preloadInterstitial();
        onDone(); // mos e blloko lojtarin duke pritur reklamën
        return;
      }
      try {
        const dismissL = await admob.addListener("interstitialAdDismissed", () => {
          dismissL.remove();
          interstitialReady = false;
          preloadInterstitial();
          onDone();
        });
        await admob.showInterstitial();
      } catch (e) {
        interstitialReady = false;
        preloadInterstitial();
        onDone();
      }
      return;
    }
    showSimulated("interstitial", SIM_INTERSTITIAL_SECONDS, onDone);
  }

  /* ---------- BANNER: vetëm në ekranin e hartës ---------- */
  let bannerVisible = false;

  async function showBanner() {
    const admob = nativeAdMob();
    if (admob) {
      if (!initialized) await init();
      try {
        await admob.showBanner({
          adId: unitIds().banner,
          adSize: "ADAPTIVE_BANNER",
          position: "BOTTOM_CENTER",
          margin: 0,
          isTesting: TEST_MODE,
        });
        bannerVisible = true;
      } catch (e) { /* pa banner */ }
      return;
    }
    // simulim në shfletues
    let el = document.getElementById("sim-banner");
    if (!el) {
      el = document.createElement("div");
      el.id = "sim-banner";
      el.className = "sim-banner";
      const slide = HOUSE_SLIDES[Math.floor(Math.random() * HOUSE_SLIDES.length)];
      el.innerHTML = `<span class="sim-banner-tag">Reklamë</span> ${slide[0]} — ${slide[1]}`;
      document.body.appendChild(el);
    }
    el.style.display = "flex";
    bannerVisible = true;
  }

  async function hideBanner() {
    if (!bannerVisible) return;
    bannerVisible = false;
    const admob = nativeAdMob();
    if (admob) {
      try { await admob.hideBanner(); } catch (e) { /* s'prish punë */ }
      return;
    }
    const el = document.getElementById("sim-banner");
    if (el) el.style.display = "none";
  }

  /* ---------- Blerjet ---------- */
  async function purchaseRemoveAds() {
    const cap = window.Capacitor;
    const purchases = cap && cap.Plugins && (cap.Plugins.Purchases || cap.Plugins.InAppPurchase);
    if (purchases && purchases.purchaseProduct) {
      try {
        await purchases.purchaseProduct({ productIdentifier: "com.fjaleshqip.game.removeads" });
        hideBanner();
        return true;
      } catch (e) {
        return false;
      }
    }
    return null; // s'ka dyqan (shfletues)
  }

  async function restorePurchases() {
    const cap = window.Capacitor;
    const purchases = cap && cap.Plugins && (cap.Plugins.Purchases || cap.Plugins.InAppPurchase);
    if (purchases && purchases.restorePurchases) {
      try {
        const res = await purchases.restorePurchases();
        const items = (res && (res.purchases || res.transactions)) || [];
        const has = items.some((p) =>
          (p.productIdentifier || p.productId) === "com.fjaleshqip.game.removeads");
        if (has) hideBanner();
        return has;
      } catch (e) {
        return false;
      }
    }
    return null;
  }

  return {
    init, showRewarded, showInterstitial, showBanner, hideBanner,
    purchaseRemoveAds, restorePurchases,
  };
})();

if (typeof module !== "undefined") {
  module.exports = { AdManager };
}
