/**
 * Runs in <head> before React. This app does not use wallets — MetaMask injects anyway.
 * Suppresses extension connect failures so Next.js dev overlay does not take over.
 */
export const EXTENSION_NOISE_SCRIPT = `
(function () {
  function noise(s) {
    if (!s) return false;
    return (
      s.indexOf("MetaMask") !== -1 ||
      s.indexOf("Failed to connect to MetaMask") !== -1 ||
      s.indexOf("chrome-extension://") !== -1 ||
      s.indexOf("nkbihfbeogaeaoehlefnkodbefgpgknn") !== -1
    );
  }
  function reasonStr(r) {
    if (!r) return "";
    if (typeof r === "string") return r;
    try {
      return (r.message || "") + "\\n" + (r.stack || "");
    } catch (e) {
      return String(r);
    }
  }
  function swallow(event) {
    var r = event.reason !== undefined ? event.reason : event.error || event.message;
    if (noise(reasonStr(r))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
    return false;
  }
  window.addEventListener("unhandledrejection", swallow, true);
  window.addEventListener("error", swallow, true);
  function patchEthereum() {
    var eth = window.ethereum;
    if (!eth || eth.__tmbfPatched) return;
    try {
      eth.__tmbfPatched = true;
      if (typeof eth.connect === "function") {
        eth.connect = function () {
          return Promise.resolve({ chainId: eth.chainId || "0x1" });
        };
      }
      if (typeof eth.request === "function") {
        var orig = eth.request.bind(eth);
        eth.request = function (args) {
          var m = args && args.method;
          if (
            m === "eth_requestAccounts" ||
            m === "wallet_requestPermissions" ||
            m === "eth_accounts"
          ) {
            return Promise.resolve([]);
          }
          return orig(args);
        };
      }
    } catch (e) {}
  }
  patchEthereum();
  var n = 0;
  var id = setInterval(function () {
    patchEthereum();
    if (++n > 100) clearInterval(id);
  }, 50);
})();
`.trim();
