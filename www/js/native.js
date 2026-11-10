/* =========================================================================
 * Native — ura mes lojës dhe plugin-eve të Capacitor (pa bundler).
 *
 * PSE KY SKEDAR: kjo faqe s'ka bundler, kështu `Capacitor.Plugins.AdMob`
 * nuk ekziston (ekziston vetëm pasi JS i plugin-it të ketë thirrur
 * registerPlugin). Këtu e thërrasim vetë `Capacitor.registerPlugin(emri)`,
 * që në telefon lidhet drejt kodit native. Emrat janë verifikuar nga
 * paketat: AdMob, Purchases, Haptics, InAppReview, App.
 * ========================================================================= */

const Native = (function () {
  "use strict";

  const cap = () => window.Capacitor;
  const cache = {};

  function isNative() {
    const c = cap();
    return !!(c && c.isNativePlatform && c.isNativePlatform());
  }

  function platform() {
    const c = cap();
    return c && c.getPlatform ? c.getPlatform() : "web";
  }

  /** Kthen plugin-in native me këtë emër, ose null në shfletues. */
  function plugin(name) {
    if (!isNative() || !cap().registerPlugin) return null;
    if (!cache[name]) cache[name] = cap().registerPlugin(name);
    return cache[name];
  }

  /** Dridhje: Haptics native në telefon, navigator.vibrate në Android-web. */
  function haptic(kind) {
    const h = plugin("Haptics");
    if (h) {
      try {
        if (kind === "success") h.notification({ type: "SUCCESS" });
        else if (kind === "error") h.notification({ type: "ERROR" });
        else if (kind === "heavy") h.impact({ style: "HEAVY" });
        else if (kind === "medium") h.impact({ style: "MEDIUM" });
        else h.impact({ style: "LIGHT" });
      } catch (e) { /* s'prish punë */ }
      return true;
    }
    return false;
  }

  /** Kërkesa për vlerësim (dritarja e sistemit). Kthen true nëse u thirr. */
  async function requestReview() {
    const r = plugin("InAppReview");
    if (!r) return false;
    try { await r.requestReview(); return true; } catch (e) { return false; }
  }

  /** Butoni "mbrapa" i Android: handler() thirret në vend të daljes nga aplikacioni. */
  function onBackButton(handler) {
    const app = plugin("App");
    if (!app) return false;
    try { app.addListener("backButton", handler); return true; } catch (e) { return false; }
  }

  function exitApp() {
    const app = plugin("App");
    if (app) { try { app.exitApp(); } catch (e) { /* s'prish punë */ } }
  }

  return { isNative, platform, plugin, haptic, requestReview, onBackButton, exitApp };
})();

if (typeof module !== "undefined") {
  module.exports = { Native };
}
