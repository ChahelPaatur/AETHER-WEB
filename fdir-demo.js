// ===== AETHER landing — FDIR console =====
// A browser-side simulation of the fault loop: four of the fifteen observation
// channels scroll past; injecting a fault bends one of them, the detector names
// it, recovery runs, and the log records each step.
(function () {
  "use strict";
  const root = document.getElementById("fdirDemo");
  if (!root) return;
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const statusEl = root.querySelector("[data-status]");
  const logEl = root.querySelector("[data-log]");
  const buttons = Array.from(root.querySelectorAll("[data-fault]"));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TICK_MS = 50;          // one sample
  const TICKS_PER_STEP = 10;   // one loop step every half second
  const SAMPLES = 180;
  const MAX_LOG = 6;

  const LANES = [
    { label: "wheel speed", base: 0.62, noise: 0.025, wave: 0.04 },
    { label: "yaw rate",    base: 0.50, noise: 0.03,  wave: 0.05 },
    { label: "battery",     base: 0.74, noise: 0.008, wave: 0.0 },
    { label: "range",       base: 0.50, noise: 0.02,  wave: 0.16 },
  ];

  // Where each fault pulls its channel, and what recovery does about it.
  const FAULTS = {
    motor_stall:    { lane: 0, p: "0.97", recover: "stop motor, hold position",     steps: 1,
                      bend: (v, k) => v + (0.08 - v) * k },
    imu_fault:      { lane: 1, p: "0.94", recover: "hold position, re-zero gyro",   steps: 2,
                      bend: (v, k, n) => v + Math.min(0.42, n * 0.022) * k },
    power_sag:      { lane: 2, p: "0.91", recover: "cut speed, flag power sag",     steps: 1,
                      bend: (v, k) => v + (0.36 - v) * k },
    sensor_dropout: { lane: 3, p: "0.99", recover: "halt on consecutive bad reads", steps: 2,
                      bend: (v, k) => (Math.random() < 0.5 * k ? (Math.random() < 0.5 ? 0.04 : 0.96) : v) },
  };

  // Fault timeline, in ticks after injection.
  const T_DETECT = 10, T_RECOVER = 28, T_CLEAR = 48;

  let tick = 0;
  let step = 4080;            // reaches 4098 once the traces are pre-filled
  let active = null;           // { id, fault, start }
  const buffers = LANES.map((l) => new Array(SAMPLES).fill(l.base));

  function noise() { return Math.random() + Math.random() + Math.random() - 1.5; }

  function sample(laneIdx) {
    const l = LANES[laneIdx];
    let v = l.base + noise() * l.noise + Math.sin(tick * 0.05 + laneIdx * 1.7) * l.wave;
    if (active && active.fault.lane === laneIdx) {
      const n = tick - active.start;
      // amount of fault: ramps in over 4 ticks, out during recovery
      let k = Math.min(1, n / 4);
      if (n >= T_RECOVER) k = Math.max(0, 1 - (n - T_RECOVER) / (T_CLEAR - T_RECOVER));
      v = active.fault.bend(v, k, n);
    }
    return Math.max(0.02, Math.min(0.98, v));
  }

  // ----- log: the last few lines, rebuilt on every entry -----
  const lines = [
    { step: 4096, kind: "", text: "FDIR online, 15-dim observation" },
    { step: 4097, kind: "", text: "nominal" },
    { step: 4098, kind: "", text: "nominal" },
  ];
  function log(kind, text) {
    lines.push({ step, kind, text });
    while (lines.length > MAX_LOG) lines.shift();
    logEl.textContent = "";
    lines.forEach((l, i) => {
      if (i) logEl.appendChild(document.createTextNode("\n"));
      const t = document.createElement("span");
      t.className = "t";
      t.textContent = "step " + l.step;
      const body = document.createElement("span");
      if (l.kind) body.className = l.kind;
      body.textContent = "  " + l.text;
      logEl.append(t, body);
    });
  }

  function setStatus(kind, text) {
    statusEl.className = "status" + (kind ? " " + kind : "");
    statusEl.textContent = text;
  }

  function setButtons(pressedId) {
    buttons.forEach((b) => {
      b.disabled = pressedId !== null;
      b.setAttribute("aria-pressed", String(b.dataset.fault === pressedId));
    });
  }

  // ----- one tick of the loop -----
  function advance() {
    tick++;
    if (tick % TICKS_PER_STEP === 0) step++;
    buffers.forEach((buf, i) => { buf.shift(); buf.push(sample(i)); });

    if (!active) return;
    const n = tick - active.start;
    const f = active.fault;
    if (n === T_DETECT) {
      setStatus("fault", active.id + " · p " + f.p);
      log("f", "fault    " + active.id + "  p=" + f.p);
    } else if (n === T_RECOVER) {
      setStatus("recovering", "recovering");
      log("", "recover  " + f.recover);
    } else if (n === T_CLEAR) {
      step += f.steps - 1;
      log("ok", "nominal  recovered in " + f.steps + (f.steps === 1 ? " step" : " steps"));
      setStatus("", "nominal");
      active = null;
      setButtons(null);
    }
  }

  function inject(id) {
    if (active || !FAULTS[id]) return;
    active = { id, fault: FAULTS[id], start: tick };
    setButtons(id);
    if (reduce) {
      // no scrolling traces: run the whole episode at once and show where it ended
      while (active) advance();
      for (let i = 0; i < 24; i++) advance();
      draw(0);
    }
  }
  buttons.forEach((b) => b.addEventListener("click", () => inject(b.dataset.fault)));

  // ----- drawing -----
  let W = 0, H = 0, dpr = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(frac) {
    ctx.clearRect(0, 0, W, H);
    const laneH = H / LANES.length;
    const dx = W / (SAMPLES - 2);
    const shift = frac * dx;
    ctx.font = '500 12px "Geist", -apple-system, sans-serif';
    ctx.textBaseline = "top";

    LANES.forEach((l, i) => {
      const top = i * laneH;
      if (i > 0) {
        ctx.fillStyle = "#1c1c1c";
        ctx.fillRect(0, Math.round(top), W, 1);
      }
      const hot = active && active.fault.lane === i && tick - active.start < T_CLEAR;
      ctx.strokeStyle = hot ? "#ff4d1c" : "#d4d4d4";
      ctx.lineWidth = hot ? 2 : 1.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      const buf = buffers[i];
      for (let s = 0; s < SAMPLES; s++) {
        const x = s * dx - shift;
        const y = top + laneH * 0.12 + (1 - buf[s]) * laneH * 0.76;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const label = l.label;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(10,10,10,0.85)";
      ctx.fillRect(10, top + 7, tw + 12, 20);
      ctx.fillStyle = hot ? "#ff4d1c" : "#a3a3a3";
      ctx.fillText(label, 16, top + 11);
    });
  }

  // ----- run only while on screen -----
  for (let i = 0; i < SAMPLES; i++) advance();   // fill the traces before first paint
  resize();
  draw(0);
  new ResizeObserver(() => { resize(); draw(0); }).observe(canvas);
  if (reduce) return;

  let inView = false;
  new IntersectionObserver((es) => es.forEach((e) => { inView = e.isIntersecting; }), { threshold: 0 }).observe(root);

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(250, now - last);
    last = now;
    if (inView && !document.hidden) {
      acc += dt;
      while (acc >= TICK_MS) { advance(); acc -= TICK_MS; }
      draw(acc / TICK_MS);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
