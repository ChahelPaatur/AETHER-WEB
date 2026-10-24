// ===== AETHER — loading screen =====
// Loaded in <head>, before the page paints. Shows the logo animation once per
// visit (and never under reduced motion), holds the hero's own entrance until
// the loader leaves, and never waits on a slow asset for long.
(function () {
  "use strict";
  var root = document.documentElement;
  var seen = false;
  try { seen = sessionStorage.getItem("aether-loader") === "1"; } catch (e) {}
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (seen || reduce) return;

  root.classList.add("has-loader", "is-loading");
  try { sessionStorage.setItem("aether-loader", "1"); } catch (e) {}

  var MIN = 2100;   // long enough for the logo to finish its move
  var MAX = 4500;   // the page shows by now even if a CDN is slow
  var start = Date.now();
  var done = false;

  function finish() {
    if (done) return;
    done = true;
    root.classList.remove("is-loading");          // scroll unlocks, the hero entrance plays
    var el = document.getElementById("loader");
    if (!el) { root.classList.remove("has-loader"); return; }
    el.classList.add("is-out");
    setTimeout(function () {
      root.classList.remove("has-loader");
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 650);
  }

  window.addEventListener("load", function () {
    setTimeout(finish, Math.max(0, MIN - (Date.now() - start)));
  });
  setTimeout(finish, MAX);
})();
