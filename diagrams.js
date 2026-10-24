// ===== AETHER landing — wired diagrams =====
// Diagram nodes are plain HTML marked data-node. This draws the dotted wires
// between them in an SVG layer and sends orange packets along the wires, and
// redraws whenever the layout changes. It also fills the benchmark dot meter.
//
//   <div data-diagram data-edges="a>b:p b>c:p,loop" data-packets="seq|fan">
//   flags: p = carries a packet · dim = quieter wire · loop = swings out right
//          v = always leave from the bottom (fan-outs to a row below)
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function parseEdges(spec) {
    return spec.trim().split(/\s+/).map((tok) => {
      const [pair, flags = ""] = tok.split(":");
      const [from, to] = pair.split(">");
      return { from, to, flags: new Set(flags.split(",").filter(Boolean)) };
    });
  }

  function rect(el, o) {
    const r = el.getBoundingClientRect();
    return {
      l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top,
      cx: (r.left + r.right) / 2 - o.left, cy: (r.top + r.bottom) / 2 - o.top,
    };
  }

  // A soft S-curve from the face of one box to the facing side of the other.
  function route(a, b, loop, vertical) {
    if (loop) {
      const x = Math.max(a.r, b.r) + 30;
      return `M${a.r},${a.cy} C${x},${a.cy} ${x},${b.cy} ${b.r},${b.cy}`;
    }
    const dx = b.cx - a.cx, dy = b.cy - a.cy;
    const stacked = Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0;
    if (vertical || stacked || Math.abs(dy) > Math.abs(dx) * 0.6) {
      const down = dy > 0;
      const sy = down ? a.b : a.t, ey = down ? b.t : b.b, m = (sy + ey) / 2;
      return `M${a.cx},${sy} C${a.cx},${m} ${b.cx},${m} ${b.cx},${ey}`;
    }
    const right = dx > 0;
    const sx = right ? a.r : a.l, ex = right ? b.l : b.r, m = (sx + ex) / 2;
    return `M${sx},${a.cy} C${m},${a.cy} ${m},${b.cy} ${ex},${b.cy}`;
  }

  // One packet that travels its wire during [s0, s1] of a shared cycle and is hidden otherwise.
  function packet(svg, d, cycle, s0, s1) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("r", "4");
    c.setAttribute("class", "d-packet");
    c.setAttribute("opacity", "0");
    const move = document.createElementNS(NS, "animateMotion");
    move.setAttribute("path", d);
    move.setAttribute("dur", cycle + "s");
    move.setAttribute("repeatCount", "indefinite");
    move.setAttribute("calcMode", "linear");
    move.setAttribute("keyPoints", "0;0;1;1");
    move.setAttribute("keyTimes", `0;${s0};${s1};1`);
    const fade = document.createElementNS(NS, "animate");
    fade.setAttribute("attributeName", "opacity");
    fade.setAttribute("dur", cycle + "s");
    fade.setAttribute("repeatCount", "indefinite");
    const e = Math.min(0.01, (s1 - s0) / 4);
    fade.setAttribute("values", "0;0;1;1;0;0");
    fade.setAttribute("keyTimes", `0;${s0};${s0 + e};${s1 - e};${s1};1`);
    c.append(move, fade);
    svg.appendChild(c);
  }

  function draw(diagram) {
    const svg = diagram.querySelector("svg.d-wires");
    const o = diagram.getBoundingClientRect();
    if (!o.width) return;
    svg.setAttribute("viewBox", `0 0 ${o.width} ${o.height}`);
    svg.setAttribute("width", o.width);
    svg.setAttribute("height", o.height);
    svg.textContent = "";

    const nodes = {};
    diagram.querySelectorAll("[data-node]").forEach((n) => { nodes[n.dataset.node] = n; });
    const carriers = [];
    parseEdges(diagram.dataset.edges || "").forEach((e) => {
      const a = nodes[e.from], b = nodes[e.to];
      if (!a || !b || !a.offsetParent || !b.offsetParent) return;
      const d = route(rect(a, o), rect(b, o), e.flags.has("loop"), e.flags.has("v"));
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "d-wire" + (e.flags.has("dim") ? " is-dim" : ""));
      svg.appendChild(path);
      if (e.flags.has("p")) carriers.push(d);
    });

    if (reduce || !carriers.length) return;
    const n = carriers.length;
    if (diagram.dataset.packets === "fan") {
      // probes leave the centre one after another and overlap
      const cycle = 3.6;
      carriers.forEach((d, i) => { const s0 = (i / n) * 0.45; packet(svg, d, cycle, s0, s0 + 0.5); });
    } else {
      // one packet walks the path, wire by wire
      const per = 0.75, cycle = n * per + 0.8;
      carriers.forEach((d, i) => packet(svg, d, cycle, (i * per) / cycle, ((i + 1) * per) / cycle));
    }
  }

  const diagrams = Array.from(document.querySelectorAll("[data-diagram]"));
  diagrams.forEach((diagram) => {
    let queued = false;
    const redraw = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; draw(diagram); });
    };
    new ResizeObserver(redraw).observe(diagram);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
    redraw();
    // pause the packets while the diagram is off screen
    const svg = diagram.querySelector("svg.d-wires");
    new IntersectionObserver((es) => es.forEach((en) => {
      if (!svg.pauseAnimations) return;
      if (en.isIntersecting) svg.unpauseAnimations(); else svg.pauseAnimations();
    })).observe(diagram);
  });

  // ----- benchmark dot meter: one dot per SFRI point -----
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
})();
