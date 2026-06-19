  // ----- Reveal on scroll -----
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // ----- Taskbar interactions -----
  const taskbar = document.getElementById("taskbar");
  const menuBtn = document.getElementById("tb-menu");
  const homeBtn = document.getElementById("tb-home");
  const menuSheet = document.getElementById("menuSheet");
  let menuOpen = false;
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menuOpen = !menuOpen;
    menuSheet.classList.toggle("open", menuOpen);
  });
  homeBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (menuOpen) { menuOpen = false; menuSheet.classList.remove("open"); }
  });
  document.addEventListener("click", (e) => {
    if (menuOpen && !menuSheet.contains(e.target) && e.target !== menuBtn) {
      menuOpen = false; menuSheet.classList.remove("open");
    }
  });
  menuSheet.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => { menuOpen = false; menuSheet.classList.remove("open"); });
  });

  // ----- Taskbar progress: dashes light up based on which section is in view -----
  const tbProgress = document.getElementById("tbProgress");
  const dashes = tbProgress.querySelectorAll("i");
  const trackedIds = ["home","overview","pipeline","features","arch","bench","install","integrations","builtby"];
  function updateProgress() {
    let activeIdx = 0;
    const y = window.scrollY + window.innerHeight * 0.4;
    trackedIds.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= y) activeIdx = i;
    });
    dashes.forEach((d, i) => d.classList.toggle("on", i <= activeIdx));
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  // ----- Taskbar hide on scroll-down, show on scroll-up -----
  let lastY = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (y > 200 && y > lastY + 6) taskbar.classList.add("hidden");
    else if (y < lastY - 6) taskbar.classList.remove("hidden");
    lastY = y;
  }, { passive: true });

  // ----- Feature card cursor-tracking radial -----
  document.querySelectorAll(".feat").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
    });
  });

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

  // ----- SFRI bar animate -----
  const sfri = document.getElementById("sfri-fill");
  if (sfri) {
    new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) { sfri.style.width = sfri.dataset.pct + "%"; }
      });
    }, { threshold: 0.4 }).observe(sfri);
  }

  // ----- Built By: click photo to colorize -----
  const builtbyPhoto = document.getElementById("builtbyPhoto");
  if (builtbyPhoto) {
    builtbyPhoto.addEventListener("click", () => {
      builtbyPhoto.classList.toggle("colored");
    });
  }
  function tick() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    document.getElementById("clock").textContent =
      pad(d.getHours()) + " : " + pad(d.getMinutes()) + " : " + pad(d.getSeconds()) + " · UTC" + (-d.getTimezoneOffset()/60);
  }
  tick(); setInterval(tick, 1000);

  // ----- Hide placeholders once user mounts three.js -----
  const heroSlot = document.getElementById("three-hero");
  const archSlot = document.getElementById("three-scene");
  const archPlaceholder = document.getElementById("three-placeholder");
  const heroGrid = document.querySelector(".hero-dither");
  new MutationObserver(() => {
    if (heroSlot && heroSlot.childNodes.length > 0 && heroGrid) {
      heroGrid.style.opacity = "0";
    }
    if (archSlot && archSlot.childNodes.length > 0 && archPlaceholder) {
      archPlaceholder.style.opacity = "0";
      archPlaceholder.style.pointerEvents = "none";
    }
  }).observe(document.body, { childList: true, subtree: true });
