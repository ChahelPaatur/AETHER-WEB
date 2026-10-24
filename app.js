// ===== AETHER landing — page behaviour =====
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  // ----- Reveal on scroll: whatever arrives together rises in sequence -----
  // Checked against position rather than IntersectionObserver, so content a
  // fast scroll or an anchor jump skips over is never left hidden.
  let pending = Array.from(document.querySelectorAll(".reveal"));
  let revealQueued = false;
  function revealArrived() {
    revealQueued = false;
    const line = window.innerHeight * 0.92;
    const batch = [];
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top < line) { batch.push(el); return false; }
      return true;
    });
    batch.forEach((el, i) => {
      el.style.setProperty("--d", Math.min(i, 5) * 80 + "ms");
      el.classList.add("in");
    });
    if (!pending.length) window.removeEventListener("scroll", queueReveal);
  }
  function queueReveal() {
    if (!revealQueued) { revealQueued = true; requestAnimationFrame(revealArrived); }
  }
  window.addEventListener("scroll", queueReveal, { passive: true });
  window.addEventListener("resize", queueReveal);
  revealArrived();

  // ----- Taskbar: home + menu -----
  const taskbar = document.getElementById("taskbar");
  const menuBtn = document.getElementById("tb-menu");
  const homeBtn = document.getElementById("tb-home");
  const menuSheet = document.getElementById("menuSheet");
  let menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    menuSheet.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  }
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setMenu(!menuOpen);
    if (menuOpen) menuSheet.querySelector("a").focus({ preventScroll: true });
  });
  homeBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMenu(false);
  });
  document.addEventListener("click", (e) => {
    if (menuOpen && !menuSheet.contains(e.target) && e.target !== menuBtn) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) { setMenu(false); menuBtn.focus(); }
  });
  menuSheet.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  // ----- Taskbar progress: dashes light up based on which section is in view -----
  const dashes = document.querySelectorAll("#tbProgress i");
  const trackedIds = ["home", "overview", "how", "safety", "arch", "bench", "integrations", "install", "contact"];
  const tracked = trackedIds.map((id) => document.getElementById(id)).filter(Boolean);
  function updateProgress() {
    let activeIdx = 0;
    const y = window.scrollY + window.innerHeight * 0.4;
    tracked.forEach((el, i) => { if (el.getBoundingClientRect().top + window.scrollY <= y) activeIdx = i; });
    dashes.forEach((d, i) => d.classList.toggle("on", i <= activeIdx));
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  // ----- Taskbar hides on scroll-down, returns on scroll-up -----
  let lastY = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y > 200 && y > lastY + 6 && !menuOpen) taskbar.classList.add("hidden");
    else if (y < lastY - 6) taskbar.classList.remove("hidden");
    lastY = y;
  }, { passive: true });

  // ----- Hero mask-hover: sharp text follows cursor, blurred elsewhere -----
  const heroTitle = document.getElementById("heroTitle");
  const hero = document.getElementById("home");
  if (heroTitle && hero) {
    // initialise centred so on-load it shows sharp text in the middle
    heroTitle.style.setProperty("--x", "50%");
    heroTitle.style.setProperty("--y", "50%");
    heroTitle.style.setProperty("--r", "1200px"); // huge on load → fully sharp
    let entered = false;
    hero.addEventListener("mousemove", (e) => {
      const r = heroTitle.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      if (!entered) {
        entered = true;
        // on first interaction, tighten the mask radius so it acts as a lens
        heroTitle.style.transition = "none";
        heroTitle.style.setProperty("--r", "440px");
      }
      heroTitle.style.setProperty("--x", x + "%");
      heroTitle.style.setProperty("--y", y + "%");
    });
    hero.addEventListener("mouseleave", () => {
      // back to fully sharp when cursor leaves
      heroTitle.style.setProperty("--r", "1200px");
      heroTitle.style.setProperty("--x", "50%");
      heroTitle.style.setProperty("--y", "50%");
      entered = false;
    });
  }

  // ----- Copy buttons -----
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const label = btn.textContent;
      const done = (ok) => {
        btn.textContent = ok ? "Copied" : "Couldn't copy";
        setTimeout(() => { btn.textContent = label; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(btn.dataset.copy).then(() => done(true), () => done(false));
      } else { done(false); }
    });
  });
})();
