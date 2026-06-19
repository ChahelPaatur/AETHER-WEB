// ===== AETHER subpage behaviour (docs.html, usage.html) =====
(function () {
  "use strict";

  // ----- Copy buttons -----
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Prefer explicit data-copy; fall back to the nearest code block text.
      let text = btn.getAttribute("data-copy");
      if (!text) {
        const wrap = btn.closest(".codewrap") || btn.parentElement;
        const pre = wrap && wrap.querySelector("pre, code");
        text = pre ? pre.innerText : "";
      }
      const done = () => {
        const prev = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = prev; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else {
        done();
      }
    });
  });

  // ----- Sidebar scroll-spy -----
  const navLinks = Array.from(document.querySelectorAll("#docNav a[href^='#']"));
  if (navLinks.length) {
    const map = new Map();
    navLinks.forEach((a) => {
      const el = document.getElementById(a.getAttribute("href").slice(1));
      if (el) map.set(el, a);
    });
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove("active"));
          const a = map.get(e.target);
          if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });
    map.forEach((_a, el) => spy.observe(el));
  }
})();
