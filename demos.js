// ===== AETHER landing — product demos =====
// Two terminals in the style of the real AETHER CLI:
//  · [data-cli]    the start-up of `aether --mode agent`, printed line by line
//  · [data-agent]  an objective running through plan → exec → sense → ok,
//                  while [data-range] draws the rover (in dots) closing on
//                  the wall in the panel beside it
// The HTML holds the finished state, so without script or with reduced
// motion each terminal simply shows the end of its run.
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // resolves while the element is on screen and the tab is visible
  function onScreen(el, threshold = 0.3) {
    let seen = false;
    new IntersectionObserver((es) => es.forEach((e) => { seen = e.isIntersecting; }), { threshold }).observe(el);
    return () => new Promise((resolve) => {
      const check = () => (seen && !document.hidden ? resolve() : setTimeout(check, 250));
      check();
    });
  }
  const show = (el, on = true) => el.toggleAttribute("hidden", !on);   // works for SVG too
  // the pixel robot draws itself in, top to bottom, a row of pixels at a time
  function buildLogo(svg) {
    const top = 104, height = 442;
    svg.querySelectorAll("rect, path, text").forEach((el) => {
      const y = parseFloat(el.getAttribute("y")) || top + 120;
      el.style.setProperty("--pd", Math.round(((y - top) / height) * 700 + Math.random() * 90) + "ms");
    });
    svg.classList.remove("is-building");
    void svg.getBoundingClientRect();   // restart the animation on every run
    svg.classList.add("is-building");
  }
  async function type(el, text, ms) {
    for (let i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await wait(ms); }
  }

  /* ───────────────────────── i2c bus map ───────────────────────── */
  // 0x00–0x7f laid out as i2cdetect prints it; a sweep runs over the empty
  // addresses (CSS), the ones a board answered on stay lit
  document.querySelectorAll("[data-i2c]").forEach((grid) => {
    const hits = new Set(grid.dataset.i2c.split(/\s+/).map((a) => parseInt(a, 16)));
    const frag = document.createDocumentFragment();
    const cell = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; frag.appendChild(el); return el; };
    cell("span");
    for (let col = 0; col < 16; col++) cell("span", "col", col.toString(16));
    for (let row = 0; row < 8; row++) {
      cell("span", "", (row * 16).toString(16).padStart(2, "0"));
      for (let col = 0; col < 16; col++) {
        const addr = row * 16 + col;
        cell("i", hits.has(addr) ? "hit" : "").style.setProperty("--k", addr);
      }
    }
    grid.appendChild(frag);
  });

  /* ───────────────────────── start-up terminal ───────────────────────── */
  document.querySelectorAll("[data-cli]").forEach((cli) => {
    if (reduce) return;
    const lines = Array.from(cli.querySelector(".cli-body").children);
    const cmd = cli.querySelector(".cmd");
    const cmdText = cmd.textContent;
    const ready = cli.querySelector(".hi");
    const visible = onScreen(cli);
    (async function play() {
      await visible();
      lines.forEach((l) => show(l, false));
      cmd.textContent = "";
      await wait(400);
      show(lines[0]);
      await type(cmd, cmdText, 55);
      await wait(350);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        show(line);
        if (line.contains(ready)) {          // the dots run before READY appears
          show(ready, false);
          await wait(1400);
          show(ready);
          await wait(300);
        } else if (line.tagName === "svg") {
          buildLogo(line);
          await wait(950);
        } else {
          await wait(line.hasAttribute("data-slow") ? 600 : 260);
        }
      }
    })();
  });

  /* ───────────────────────── rover range scene ───────────────────────── */
  const range = { cm: 42, running: false, stalled: false };
  const START_CM = 42, STOP_CM = 5.2;

  document.querySelectorAll("[data-range]").forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    // the rover, drawn in dots: X body, O wheel, S ultrasonic sensor
    const ROVER = [
      "...........SS.",
      "..XXXXXXXXXXX.",
      ".XXXXXXXXXXXXX",
      ".XXXXXXXXXXXXX",
      "..OO.....OO...",
      ".O..O...O..O..",
      "..OO.....OO...",
    ];
    let W = 0, H = 0, dpr = 1;
    const pings = [];
    let lastPing = 0;

    function size() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      const s = Math.max(5, Math.min(11, H * 0.022, W * 0.02));   // dot pitch
      const floorY = Math.round(H * 0.66);
      const wallX = W * 0.84;
      const roverW = ROVER[0].length * s;
      const startNose = W * 0.07 + roverW;
      const pxPerCm = (wallX - startNose) / START_CM;
      const nose = wallX - range.cm * pxPerCm;
      const left = nose - roverW;
      const top = floorY - ROVER.length * s;

      for (let x = s; x < W - s; x += s * 1.6) dot(x, floorY + s * 0.9, 1.3, "#1d3445");
      for (let y = floorY - H * 0.3; y <= floorY; y += s) for (let x = wallX; x < Math.min(W - s, wallX + s * 6); x += s) dot(x, y, s * 0.28, "#2b5573");
      ROVER.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch === ".") return;
        const c = ch === "S" ? "#FC734D" : ch === "O" ? "#5d7a8f" : "#EDF3F7";
        dot(left + i * s + s / 2, top + j * s + s / 2, s * 0.32, c);
      }));
      const sensorX = nose, sensorY = top + s / 2;
      if (range.running && !range.stalled && now - lastPing > 420) { pings.push({ t0: now }); lastPing = now; }
      for (let i = pings.length - 1; i >= 0; i--) {
        const age = (now - pings[i].t0) / 1000;
        const rad = age * (wallX - sensorX + 40) * 1.6;
        if (rad > wallX - sensorX + 4 || age > 1.5) { pings.splice(i, 1); continue; }
        const alpha = Math.max(0, 1 - age * 1.4);
        for (let a = -0.5; a <= 0.5; a += 0.12) dot(sensorX + Math.cos(a) * rad, sensorY + Math.sin(a) * rad, 1.6, `rgba(61,181,242,${alpha})`);
      }
      const gapY = top - s * 1.6;
      for (let x = nose + s; x < wallX - s * 0.5; x += s * 0.9) dot(x, gapY, 1.2, "#2c4456");
      ctx.font = `900 ${Math.round(Math.max(18, Math.min(34, H * 0.06)))}px "Doto", "Geist Mono", monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillStyle = range.stalled ? "#FC734D" : "#EDF3F7";
      const label = range.cm.toFixed(1) + " cm";
      const half = ctx.measureText(label).width / 2 + 8;
      ctx.fillText(label, Math.max(half, Math.min((nose + wallX) / 2, wallX - half)), gapY - 10);
    }

    size();
    new ResizeObserver(() => { size(); draw(performance.now()); }).observe(canvas);
    if (document.fonts) document.fonts.load('900 20px "Doto"').then(() => draw(performance.now()));
    if (reduce) { range.cm = STOP_CM; draw(0); return; }
    let inView = false;
    new IntersectionObserver((es) => es.forEach((e) => { inView = e.isIntersecting; })).observe(canvas);
    (function frame(now) {
      if (inView && !document.hidden) draw(now);
      requestAnimationFrame(frame);
    })(performance.now());
  });

  /* ───────────────────────── agent session ───────────────────────── */
  document.querySelectorAll("[data-agent]").forEach((agent) => {
    const step = (k) => agent.querySelector(`[data-step="${k}"]`);
    const steps = Array.from(agent.querySelectorAll("[data-step]"));
    const prompt = agent.querySelector("[data-prompt]");
    const promptText = prompt.textContent;
    const runCm = agent.querySelector("[data-run-cm]");
    const bar = agent.querySelector("[data-run-bar]");
    const fdir = agent.querySelector("[data-fdir]");
    const faults = agent.querySelector("[data-fault-lines]");
    const status = agent.querySelector("[data-status-fdir]");
    const setStatus = (text, fault) => { if (status) { status.textContent = text; status.classList.toggle("is-fault", fault); } };
    const setCm = (cm) => {
      range.cm = cm;
      runCm.textContent = cm.toFixed(1);
      bar.style.transform = `scaleX(${(START_CM - cm) / (START_CM - STOP_CM)})`;
    };
    const say = (html) => {
      const p = document.createElement("p");
      p.className = "cl";
      p.innerHTML = html;
      faults.appendChild(p);
    };
    fdir.dataset.kind = "ok";
    if (reduce) { setCm(STOP_CM); return; }

    // drive_until_obstacle's approach curve: full speed far out, about 60%
    // between 1.5x and 3x the target, about 35% inside 1.5x
    const TARGET = 5;
    const speedAt = (cm) => (cm > TARGET * 3 ? 1 : cm > TARGET * 1.5 ? 0.6 : 0.35);
    const BASE = 14.5; // cm per second at full speed

    const visible = onScreen(agent);
    let withFault = false;

    async function drive() {
      let cm = START_CM, last = performance.now(), stalledOnce = false;
      range.running = true;
      while (cm > STOP_CM) {
        await new Promise((r) => requestAnimationFrame(r));
        const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        cm = Math.max(STOP_CM, cm - BASE * speedAt(cm) * dt);
        setCm(cm);
        if (withFault && !stalledOnce && cm < 24) {
          stalledOnce = true;
          range.stalled = true;
          say('<span class="tag tag-fault">[FDIR]</span>  motor_stall  p=0.97 → stop motor, hold position');
          setStatus("FDIR motor_stall", true);
          await wait(1500);
          say('<span class="tag tag-ok">[FDIR]</span>  recovered in 1 step · resuming');
          setStatus("FDIR nominal", false);
          range.stalled = false;
          last = performance.now();
        }
      }
      range.running = false;
    }

    (async function play() {
      for (;;) {
        await visible();
        steps.forEach((s) => { s.hidden = true; });
        faults.textContent = "";
        prompt.textContent = "";
        setCm(START_CM);
        await wait(500);

        step("prompt").hidden = false;
        await type(prompt, promptText, 32);
        await wait(500);
        step("plan").hidden = false; await wait(700);
        step("exec").hidden = false; await wait(450);
        step("route").hidden = false; await wait(350);
        step("run").hidden = false;
        await drive();
        await wait(250);
        fdir.dataset.kind = "ok";
        fdir.textContent = withFault ? "1 fault · recovered in 1 step" : "nominal · 0 faults";
        step("fdir").hidden = false; await wait(350);
        step("ok").hidden = false; await wait(300);
        step("next").hidden = false;
        await wait(4800);
        withFault = !withFault;
      }
    })();
  });
})();
