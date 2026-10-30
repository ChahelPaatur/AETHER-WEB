// ===== AETHER landing — page behaviour =====
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----- Benchmark dot meter: one dot per SFRI point (built before reveal runs) -----
  document.querySelectorAll("[data-meter]").forEach((meter) => {
    const value = parseFloat(meter.dataset.meter);
    const max = parseInt(meter.dataset.max, 10);
    for (let i = 0; i < max; i++) {
      const dot = document.createElement("i");
      if (i < Math.floor(value)) dot.className = "on";
      else if (i < value) dot.className = "on part";
      dot.style.setProperty("--i", i);
      meter.appendChild(dot);
    }
  });

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

  // ----- Nav: glass once the page moves, a dot on the section you're in -----
  const nav = document.getElementById("nav");
  const links = Array.from(document.querySelectorAll(".nav-links a[data-spy]"));
  const sections = Array.from(document.querySelectorAll("[data-nav]"));
  let navQueued = false;
  function updateNav() {
    navQueued = false;
    nav.classList.toggle("is-scrolled", window.scrollY > 24);
    const y = window.innerHeight * 0.4;
    let current = "";
    sections.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) current = s.dataset.nav;
    });
    links.forEach((a) => a.classList.toggle("is-active", a.dataset.spy === current));
  }
  window.addEventListener("scroll", () => {
    if (!navQueued) { navQueued = true; requestAnimationFrame(updateNav); }
  }, { passive: true });
  window.addEventListener("resize", updateNav);
  updateNav();

  // ----- Menu sheet (narrow screens) -----
  const menuBtn = document.getElementById("navMenu");
  const sheet = document.getElementById("navSheet");
  let menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    sheet.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  }
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setMenu(!menuOpen);
    if (menuOpen) sheet.querySelector("a").focus({ preventScroll: true });
  });
  document.addEventListener("click", (e) => {
    if (menuOpen && !sheet.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) { setMenu(false); menuBtn.focus(); }
  });
  sheet.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  window.matchMedia("(min-width: 981px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  // ----- Hero lens: the sharp wordmark follows the cursor, blurred elsewhere -----
  // The mask is written onto the element itself: Chrome doesn't repaint a
  // mask when only the custom properties inside it change.
  const heroTitle = document.getElementById("heroTitle");
  const hero = document.getElementById("home");
  const sharp = heroTitle && heroTitle.querySelector(".mask-sharp");
  if (hero && sharp) {
    const lens = (x, y, r) => {
      const m = `radial-gradient(circle ${r}px at ${x}% ${y}%, #000 60%, transparent 100%)`;
      sharp.style.webkitMaskImage = m;
      sharp.style.maskImage = m;
    };
    hero.addEventListener("mousemove", (e) => {
      const r = heroTitle.getBoundingClientRect();
      lens(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100, Math.round(r.height * 1.7));
    });
    hero.addEventListener("mouseleave", () => lens(50, 50, 2000));   // fully sharp again
  }

  // ----- Hero readout: the FDIR loop rate drifts a little, like the real one -----
  const liveHz = document.getElementById("liveHz");
  if (liveHz && !reduce) {
    setInterval(() => { liveHz.textContent = (1280 + Math.round((Math.random() - 0.5) * 40)).toLocaleString("en-US"); }, 1400);
  }

  // ----- The three views: swing into place as the band scrolls in -----
  const tilt = document.querySelector("[data-tilt]");
  if (tilt && !reduce) {
    let tiltQueued = false;
    const updateTilt = () => {
      tiltQueued = false;
      const top = tilt.getBoundingClientRect().top, vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.85)));
      tilt.style.setProperty("--p", p.toFixed(3));
    };
    window.addEventListener("scroll", () => {
      if (!tiltQueued) { tiltQueued = true; requestAnimationFrame(updateTilt); }
    }, { passive: true });
    window.addEventListener("resize", updateTilt);
    updateTilt();
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
