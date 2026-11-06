/* =========================================================================
 * AdManager — reklamat dhe blerjet (të ardhurat e lojës)
 *
 * Vendet e reklamave (balancuar për të ardhura pa prishur përvojën):
 *  1. REWARDED — lojtari zgjedh vetë: Dyqani (+30) dhe "Dyfisho" në fitore.
 *  2. INTERSTITIAL — pas çdo 3 fitoresh, jo para nivelit 4, ftohje 90 s
 *     (rregullohet nga game.js).
 *  3. BANNER adaptiv — vetëm në hartën e qyteteve.
 * "Hiq reklamat" (RevenueCat) fik 2 dhe 3; rewarded mbetet gjithmonë.
 *
 * Të gjitha ID-të vijnë nga APP_CONFIG (js/config.js). Plugin-et thirren
 * përmes Native.plugin(...) — shih native.js pse. Në shfletues punon një
 * simulim që sillet njësoj (për zhvillim dhe testim).
 * ========================================================================= */

const AdManager = (function () {
  "use strict";

  const CFG = APP_CONFIG;
  const TEST_MODE = CFG.testMode;

  /* ID-të zyrtare TESTUESE të Google — përdoren kur testMode=true. */
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

  const isPlaceholder = (s) => !s || /X{4,}/.test(s);
  const admob = () => Native.plugin("AdMob");
  const purchases = () => Native.plugin("Purchases");

  function unitIds() {
    const table = TEST_MODE ? TEST_UNITS : CFG.admob.units;
    return Native.platform() === "ios" ? table.ios : table.android;
  }

  let initialized = false;
  let interstitialReady = false;
  let rewardedReady = false;
  let rcReady = false;

  /* ---------- Nisja: RevenueCat, pëlqimi (ATT + UMP) dhe parangarkimi ---------- */
  async function init() {
    if (!Native.isNative() || initialized) return;
    initialized = true; // mos e nis dy herë nëse thirret njëkohësisht

    // 1. Blerjet
    const rc = purchases();
    const rcKey = Native.platform() === "ios" ? CFG.revenuecat.apiKey.ios : CFG.revenuecat.apiKey.android;
    if (rc && !isPlaceholder(rcKey)) {
      try { await rc.configure({ apiKey: rcKey }); rcReady = true; } catch (e) { rcReady = false; }
    }

    const ad = admob();
    if (!ad) return;
    try {
      // 2. iOS App Tracking Transparency — kërkohet nga Apple
      if (Native.platform() === "ios") {
        try { await ad.requestTrackingAuthorization(); } catch (e) { /* vazhdo */ }
      }
      // 3. Pëlqimi GDPR (UMP) — pa të NUK paguhesh për përdoruesit e BE-së
      try {
        const info = await ad.requestConsentInfo();
        if (info && info.isConsentFormAvailable && info.status === "REQUIRED") {
          await ad.showConsentForm();
        }
      } catch (e) { /* vazhdo me reklama të papersonalizuara */ }
      // 4. Nis SDK-në
      await ad.initialize({ initializeForTesting: TEST_MODE });
      // 5. Parangarko që reklamat të hapen pa vonesë
      preloadInterstitial();
      preloadRewarded();
    } catch (e) { /* loja vazhdon pa reklama */ }
  }

  async function preloadInterstitial() {
    const ad = admob();
    if (!ad) return;
    try {
      await ad.prepareInterstitial({ adId: unitIds().interstitial, isTesting: TEST_MODE });
      interstitialReady = true;
    } catch (e) { interstitialReady = false; }
  }

  async function preloadRewarded() {
    const ad = admob();
    if (!ad) return;
    try {
      await ad.prepareRewardVideoAd({ adId: unitIds().rewarded, isTesting: TEST_MODE });
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
    const countEl = document.getElementById("ad-count");
    const closeBtn = document.getElementById("btn-ad-close");
    const slide = HOUSE_SLIDES[Math.floor(Math.random() * HOUSE_SLIDES.length)];

    document.getElementById("ad-title").textContent = slide[0];
    document.getElementById("ad-body").textContent = slide[1];
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

  /* ---------- REWARDED: onReward() vetëm po u pa deri në fund ---------- */
  async function showRewarded(onReward, onUnavailable) {
    const ad = admob();
    if (ad) {
      if (!rewardedReady) {
        preloadRewarded();
        if (onUnavailable) onUnavailable();
        return;
      }
      try {
        let gotReward = false;
        const rewardL = await ad.addListener("onRewardedVideoAdReward", () => { gotReward = true; });
        const dismissL = await ad.addListener("onRewardedVideoAdDismissed", () => {
          rewardL.remove();
          dismissL.remove();
          rewardedReady = false;
          preloadRewarded();
          if (gotReward) onReward();
        });
        await ad.showRewardVideoAd();
      } catch (e) {
        rewardedReady = false;
        preloadRewarded();
        if (onUnavailable) onUnavailable();
      }
      return;
    }
    if (Native.isNative()) { if (onUnavailable) onUnavailable(); return; }
    showSimulated("rewarded", SIM_REWARDED_SECONDS, onReward);
  }

  /* ---------- INTERSTITIAL: onDone() kur mbyllet ---------- */
  async function showInterstitial(onDone) {
    const ad = admob();
    if (ad) {
      if (!interstitialReady) {
        preloadInterstitial();
        onDone(); // mos e blloko lojtarin duke pritur reklamën
        return;
      }
      try {
        const dismissL = await ad.addListener("interstitialAdDismissed", () => {
          dismissL.remove();
          interstitialReady = false;
          preloadInterstitial();
          onDone();
        });
        await ad.showInterstitial();
      } catch (e) {
        interstitialReady = false;
        preloadInterstitial();
        onDone();
      }
      return;
    }
    if (Native.isNative()) { onDone(); return; }
    showSimulated("interstitial", SIM_INTERSTITIAL_SECONDS, onDone);
  }

  /* ---------- BANNER: vetëm në ekranin e hartës ---------- */
  let bannerVisible = false;

  async function showBanner() {
    const ad = admob();
    if (ad) {
      try {
        await ad.showBanner({
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
    if (Native.isNative()) return;
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
    const ad = admob();
    if (ad) {
      try { await ad.hideBanner(); } catch (e) { /* s'prish punë */ }
      return;
    }
    const el = document.getElementById("sim-banner");
    if (el) el.style.display = "none";
  }

  /* ---------- Blerjet (RevenueCat) ----------
   * Kthen: true = blerë, false = anuluar/dështoi, null = s'ka dyqan
   * (shfletues), "unavailable" = aplikacion native por dyqani s'është
   * konfiguruar ende (API key / offering). */
  const hasEntitlement = (info) =>
    !!(info && info.entitlements && info.entitlements.active && info.entitlements.active[CFG.revenuecat.entitlement]);

  async function purchaseRemoveAds() {
    if (!Native.isNative()) return null;
    if (!rcReady) { await init(); }
    const rc = purchases();
    if (!rc || !rcReady) return "unavailable";
    try {
      const offerings = await rc.getOfferings();
      const pkg = offerings.current && offerings.current.availablePackages && offerings.current.availablePackages[0];
      if (!pkg) return "unavailable";
      const res = await rc.purchasePackage({ aPackage: pkg });
      const ok = hasEntitlement(res.customerInfo);
      if (ok) hideBanner();
      return ok;
    } catch (e) {
      return false; // përfshirë anulimin nga përdoruesi
    }
  }

  async function restorePurchases() {
    if (!Native.isNative()) return null;
    if (!rcReady) { await init(); }
    const rc = purchases();
    if (!rc || !rcReady) return "unavailable";
    try {
      const res = await rc.restorePurchases();
      const ok = hasEntitlement(res.customerInfo);
      if (ok) hideBanner();
      return ok;
    } catch (e) {
      return false;
    }
  }

  /** Gjendja e vërtetë e premium nga dyqani (kap edhe rimbursimet).
   *  true/false nëse dihet, null nëse s'mund të pyetet. */
  async function syncPremium() {
    if (!Native.isNative()) return null;
    if (!rcReady) { await init(); }
    const rc = purchases();
    if (!rc || !rcReady) return null;
    try {
      const res = await rc.getCustomerInfo();
      return hasEntitlement(res.customerInfo);
    } catch (e) {
      return null;
    }
  }

  return {
    init, showRewarded, showInterstitial, showBanner, hideBanner,
    purchaseRemoveAds, restorePurchases, syncPremium,
  };
})();

if (typeof module !== "undefined") {
  module.exports = { AdManager };
}
