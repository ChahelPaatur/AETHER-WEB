// ===== AETHER docs — minimal behaviour (copy buttons + scrollspy) =====
(function () {
  "use strict";

  // ----- Copy buttons -----
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      let text = btn.getAttribute("data-copy");
      if (!text) {
        const wrap = btn.closest(".code") || btn.parentElement;
        const pre = wrap && wrap.querySelector("pre, code");
        text = pre ? pre.innerText : "";
      }
      const done = () => {
        const prev = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = prev; }, 1300);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else { done(); }
    });
  });

  // ----- Scrollspy: highlight the current section in nav + toc -----
  const sections = Array.from(document.querySelectorAll("main.doccontent section[id]"));
  const links = Array.from(document.querySelectorAll(".docnav a, .doctoc a"));
  if (sections.length && links.length) {
    const linksFor = (id) =>
      links.filter((a) => (a.getAttribute("href") || "").endsWith("#" + id));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((a) => a.classList.remove("active"));
            linksFor(e.target.id).forEach((a) => a.classList.add("active"));
          }
        });
      }, { rootMargin: "-20% 0px -72% 0px", threshold: 0 });
      sections.forEach((s) => io.observe(s));
    }
  }
})();
