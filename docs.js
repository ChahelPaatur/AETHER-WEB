// ===== AETHER docs — page list drawer, copy buttons, scrollspy =====
(function () {
  "use strict";

  // ----- Page list: a drawer behind the Menu button on narrow screens -----
  const nav = document.getElementById("docnav");
  const menuBtn = document.querySelector(".docmenu-btn");
  if (nav && menuBtn) {
    const backdrop = document.createElement("div");
    backdrop.className = "doc-backdrop";
    nav.after(backdrop);
    const narrow = window.matchMedia("(max-width: 900px)");

    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      backdrop.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.querySelector("span").textContent = open ? "Close" : "Menu";
      document.body.style.overflow = open ? "hidden" : "";
    };
    menuBtn.addEventListener("click", () => {
      const open = !nav.classList.contains("open");
      setOpen(open);
      if (open) (nav.querySelector("a.active") || nav.querySelector("a")).focus({ preventScroll: true });
    });
    backdrop.addEventListener("click", () => setOpen(false));
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) { setOpen(false); menuBtn.focus(); }
    });
    narrow.addEventListener("change", (e) => { if (!e.matches) setOpen(false); });
  }

  // ----- Keep the current page in view inside the (scrolling) page list -----
  const list = document.querySelector(".docnav-sticky");
  const current = list && list.querySelector("a.active");
  if (current) {
    const top = current.offsetTop - list.clientHeight / 2 + current.offsetHeight / 2;
    list.scrollTop = Math.max(0, top);
  }

  // ----- Copy buttons -----
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      let text = btn.getAttribute("data-copy");
      if (!text) {
        const wrap = btn.closest(".code") || btn.parentElement;
        const pre = wrap && wrap.querySelector("pre, code");
        text = pre ? pre.innerText : "";
      }
      const label = btn.textContent;
      const done = (ok) => {
        btn.textContent = ok ? "Copied" : "Couldn't copy";
        setTimeout(() => { btn.textContent = label; }, 1300);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
      } else { done(false); }
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
