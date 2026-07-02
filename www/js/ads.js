/* =========================================================================
 * AdManager — reklamat dhe blerjet
 *
 * Modeli i monetizimit: loja është FALAS.
 *  - Reklama me shpërblim (rewarded): lojtari zgjedh vetë t'i shohë
 *    në dyqan për të fituar monedha.
 *  - Reklama të plota (interstitial): ndonjëherë pas përfundimit të
 *    një niveli, me kufi frekuence.
 *  - "Hiq reklamat": blerje brenda aplikacionit (IAP) që i fik të gjitha.
 *
 * Në telefon (Capacitor) përdoret Google AdMob përmes
 * @capacitor-community/admob. Në shfletues (zhvillim/PWA) përdoret një
 * reklamë e simuluar që sillet njësoj, kështu që gjithë rrjedha e lojës
 * testohet pa SDK. ID-të më poshtë janë ID-të ZYRTARE TESTUESE të
 * Google — zëvendësoji me ID-të e tua të AdMob para publikimit.
 * ========================================================================= */

const AdManager = (function () {
  "use strict";

  const CONFIG = {
    // ID testuese të Google AdMob — ZËVENDËSO para publikimit!
    ios: {
      rewarded: "ca-app-pub-3940256099942544/1712485313",
      interstitial: "ca-app-pub-3940256099942544/4411468910",
    },
    android: {
      rewarded: "ca-app-pub-3940256099942544/5224354917",
      interstitial: "ca-app-pub-3940256099942544/1033173712",
    },
    simulatedRewardedSeconds: 5,
    simulatedInterstitialSeconds: 3,
  };

  function nativeAdMob() {
    const cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.AdMob) {
      return cap.Plugins.AdMob;
    }
    return null;
  }

  function platformIds() {
    const cap = window.Capacitor;
    const p = cap && cap.getPlatform ? cap.getPlatform() : "web";
    return p === "ios" ? CONFIG.ios : CONFIG.android;
  }

  let initialized = false;
  async function init() {
    const admob = nativeAdMob();
    if (admob && !initialized) {
      try {
        await admob.initialize({});
        initialized = true;
      } catch (e) { /* vazhdo pa reklama native */ }
    }
  }

  /* ---------- Reklama e simuluar (shfletues / zhvillim) ---------- */
  // Përmbajtje "shtëpiake": fjalë shqipe me kuptimin e tyre.
  const HOUSE_SLIDES = [
    ["SHQIPONJA", "Zogu madhështor i maleve tona — simboli i flamurit."],
    ["BESA", "Fjala e dhënë që s'thyhet kurrë — krenaria shqiptare."],
    ["MËSO SHQIP", "Çdo nivel të mëson fjalë të reja nga fjalori."],
    ["ATDHEU", "Nga Vermoshi në Konispol — luaj nëpër gjithë Shqipërinë."],
  ];

  function showSimulated(kind, seconds, onFinish, onSkipDenied) {
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
      if (closeBtn.disabled) { if (onSkipDenied) onSkipDenied(); return; }
      overlay.classList.remove("show");
      closeBtn.onclick = null;
      onFinish();
    };
  }

  /* ---------- API publike ---------- */

  /** Reklamë me shpërblim; thirr onReward() vetëm nëse u pa deri në fund. */
  async function showRewarded(onReward, onUnavailable) {
    const admob = nativeAdMob();
    if (admob) {
      try {
        await init();
        const ids = platformIds();
        await admob.prepareRewardVideoAd({ adId: ids.rewarded });
        const listener = await admob.addListener("onRewardedVideoAdReward", () => {
          listener.remove();
          onReward();
        });
        await admob.showRewardVideoAd();
        return;
      } catch (e) {
        if (onUnavailable) onUnavailable();
        return;
      }
    }
    showSimulated("rewarded", CONFIG.simulatedRewardedSeconds, onReward);
  }

  /** Reklamë e plotë mes niveleve; thirr onDone() kur mbyllet. */
  async function showInterstitial(onDone) {
    const admob = nativeAdMob();
    if (admob) {
      try {
        await init();
        const ids = platformIds();
        await admob.prepareInterstitial({ adId: ids.interstitial });
        const listener = await admob.addListener("onInterstitialAdDismissed", () => {
          listener.remove();
          onDone();
        });
        await admob.showInterstitial();
        return;
      } catch (e) {
        onDone();
        return;
      }
    }
    showSimulated("interstitial", CONFIG.simulatedInterstitialSeconds, onDone);
  }

  /** Blerja "Hiq reklamat". Në telefon lidhet me dyqanin (StoreKit /
   *  Google Play Billing — shih README). Kthen true nëse u krye. */
  async function purchaseRemoveAds() {
    const cap = window.Capacitor;
    const purchases = cap && cap.Plugins && (cap.Plugins.Purchases || cap.Plugins.InAppPurchase);
    if (purchases && purchases.purchaseProduct) {
      try {
        await purchases.purchaseProduct({ productIdentifier: "com.fjaleshqip.game.removeads" });
        return true;
      } catch (e) {
        return false;
      }
    }
    return null; // s'ka dyqan (shfletues)
  }

  /** Rikthimi i blerjeve (kërkesë e Apple për IAP jo-konsumuese).
   *  true = u rikthye premium, false = s'u gjet asgjë, null = s'ka dyqan. */
  async function restorePurchases() {
    const cap = window.Capacitor;
    const purchases = cap && cap.Plugins && (cap.Plugins.Purchases || cap.Plugins.InAppPurchase);
    if (purchases && purchases.restorePurchases) {
      try {
        const res = await purchases.restorePurchases();
        const items = (res && (res.purchases || res.transactions)) || [];
        return items.some((p) =>
          (p.productIdentifier || p.productId) === "com.fjaleshqip.game.removeads");
      } catch (e) {
        return false;
      }
    }
    return null;
  }

  return { init, showRewarded, showInterstitial, purchaseRemoveAds, restorePurchases };
})();

if (typeof module !== "undefined") {
  module.exports = { AdManager };
}
