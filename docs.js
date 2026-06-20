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

  // ----- Scrollspy: highlight the current heading in the right-hand TOC -----
  const heads = Array.from(document.querySelectorAll("main.doccontent h1[id], main.doccontent h3[id]"));
  const tocLinks = Array.from(document.querySelectorAll(".doctoc a"));
  if (heads.length && tocLinks.length && "IntersectionObserver" in window) {
    const linkFor = (id) => tocLinks.filter((a) => (a.getAttribute("href") || "") === "#" + id);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          tocLinks.forEach((a) => a.classList.remove("active"));
          linkFor(e.target.id).forEach((a) => a.classList.add("active"));
        }
      });
    }, { rootMargin: "-12% 0px -78% 0px", threshold: 0 });
    heads.forEach((h) => io.observe(h));
  }
})();
