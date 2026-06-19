// ===== AETHER subpage behaviour (docs.html, usage.html) =====
(function () {
  "use strict";

  // ----- Modern modal: feature cards open a detail sheet -----
  const modal = document.getElementById("modal");
  if (modal) {
    const mTitle = document.getElementById("modalTitle");
    const mTag   = document.getElementById("modalTag");
    const mBody  = document.getElementById("modalBody");
    const mIco   = document.getElementById("modalIco");
    const mCode  = modal.querySelector("#modalCode code");
    const mClose = document.getElementById("modalClose");
    let lastFocus = null;

    const openModal = (card) => {
      const t = card.querySelector("h4");
      mTitle.innerHTML = t ? t.innerHTML : (card.dataset.title || "");
      mTag.textContent = card.dataset.tag || "";
      mBody.textContent = card.dataset.more || "";
      mCode.innerHTML = card.dataset.code || "";
      const g = card.querySelector(".glyph svg");
      mIco.innerHTML = g ? g.outerHTML : "";
      modal.querySelector("#modalCode").style.display = card.dataset.code ? "" : "none";
      lastFocus = document.activeElement;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      mClose.focus();
    };
    const closeModal = () => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    document.querySelectorAll(".card-clickable").forEach((card) => {
      card.addEventListener("click", () => openModal(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(card); }
      });
    });
    mClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });
  }

  // ----- Cursor-driven 3D tilt on cards -----
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".card3d").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (px * 100) + "%");
        card.style.setProperty("--my", (py * 100) + "%");
        const rx = (0.5 - py) * 9;   // tilt up / down
        const ry = (px - 0.5) * 11;  // tilt left / right
        card.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-5px)";
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }

  // ----- 3D scroll reveal -----
  const revealables = document.querySelectorAll(".reveal3d");
  if (revealables.length) {
    if ("IntersectionObserver" in window) {
      const ro = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      revealables.forEach((el) => ro.observe(el));
    } else {
      revealables.forEach((el) => el.classList.add("in"));
    }
  }

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
