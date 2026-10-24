// ===== AETHER landing — the AETHER board, a concept render =====
// A black board with white silkscreen and orange traces: a main chip, a 40-pin
// header, four servo connectors, USB-C, status LEDs, and signal pulses running
// along the traces. Built procedurally; drag to turn it.
(function () {
  "use strict";
  if (!window.THREE) return;
  const mount = document.getElementById("board-scene");
  if (!mount) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const W = () => mount.clientWidth || 600;
  const H = () => mount.clientHeight || 400;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.cursor = "grab";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, W() / H(), 0.1, 100);

  // ── soft studio light: a dim room with one big softbox and an orange strip,
  //    baked into an environment map so the metal parts read as metal
  (function environment() {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x2a2a2a, side: THREE.BackSide })));
    const box = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    box.position.set(0, 12, 4); box.lookAt(0, 0, 0); env.add(box);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.2), new THREE.MeshBasicMaterial({ color: 0xff6a3d }));
    strip.position.set(-10, 3, -8); strip.lookAt(0, 0, 0); env.add(strip);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.03).texture;
  })();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 10, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff6a3d, 0.9); rim.position.set(-8, 3, -6); scene.add(rim);

  // ── dimensions: 1 unit = 10 mm, roughly a Raspberry Pi footprint
  const BW = 8.6, BD = 5.6, T = 0.16, R = 0.35, TOP = T + 0.015;
  const board = new THREE.Group();
  scene.add(board);

  function roundedRect(s, x, y, w, h, r) {
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  }
  const HOLES = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [sx * (BW / 2 - 0.35), sz * (BD / 2 - 0.35)]);

  // board blank, with real mounting holes
  const shape = new THREE.Shape();
  roundedRect(shape, -BW / 2, -BD / 2, BW, BD, R);
  HOLES.forEach(([x, z]) => { const h = new THREE.Path(); h.absarc(x, -z, 0.15, 0, Math.PI * 2, true); shape.holes.push(h); });
  const pcbGeo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 20 });
  pcbGeo.rotateX(-Math.PI / 2);
  board.add(new THREE.Mesh(pcbGeo, [
    new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.62, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.8, metalness: 0.05 }),
  ]));

  // ── silkscreen + traces, painted on a canvas laid over the top face
  const PX = 240;
  const cv = document.createElement("canvas");
  cv.width = Math.round(BW * PX); cv.height = Math.round(BD * PX);
  const g = cv.getContext("2d");
  const cx = (x) => (x + BW / 2) * PX;           // board x → canvas x
  const cz = (z) => (z + BD / 2) * PX;           // board z → canvas y (back edge at the top)
  const silkTex = new THREE.CanvasTexture(cv);
  silkTex.colorSpace = THREE.SRGBColorSpace;
  silkTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const silk = new THREE.Mesh(new THREE.PlaneGeometry(BW, BD), new THREE.MeshStandardMaterial({ map: silkTex, transparent: true, roughness: 0.75, metalness: 0 }));
  silk.rotation.x = -Math.PI / 2;
  silk.position.y = TOP + 0.002;
  board.add(silk);

  // Traces in board coordinates [x, z]; signal pulses ride the same paths.
  const MCU = { x: -1.3, z: 0.3, s: 1.5 };
  const HEADER_Z = [-2.45, -2.196];
  const pinX = (i) => -2.413 + i * 0.254;
  const SERVO_X = [1.75, 2.45, 3.15, 3.85], SERVO_Z = 2.25;
  const traces = [];
  // main chip → header (a bus of six lines)
  for (let i = 0; i < 6; i++) {
    const sx = MCU.x - 0.5 + i * 0.2, px = pinX(4 + i * 2);
    traces.push([[sx, MCU.z - MCU.s / 2], [sx, -1.2 + i * 0.04], [px, -1.65], [px, HEADER_Z[1] + 0.12]]);
  }
  // main chip → servo driver → servo connectors
  traces.push([[MCU.x + MCU.s / 2, 0.55], [0.15, 0.55], [0.4, 0.8], [0.4, 1.05]]);
  traces.push([[MCU.x + MCU.s / 2, 0.85], [-0.05, 0.85], [0.15, 1.05]]);
  SERVO_X.forEach((x, i) => traces.push([[1.45, 1.05 + i * 0.12], [x - 0.25 + 0.0, 1.05 + i * 0.12], [x, 1.3 + i * 0.12], [x, SERVO_Z - 0.3]]));
  // main chip → flash
  traces.push([[MCU.x + MCU.s / 2, 0.0], [0.3, 0.0]]);
  // USB-C → regulator → main chip (power)
  traces.push([[-3.65, 0.55], [-3.1, 0.55], [-2.85, 0.3], [MCU.x - MCU.s / 2, 0.3]]);
  // crystal → main chip
  traces.push([[-2.45, -0.75], [-2.2, -0.5], [MCU.x - MCU.s / 2, -0.5]]);

  function paintSilk() {
    g.clearRect(0, 0, cv.width, cv.height);
    // copper traces under the solder mask: orange, slightly translucent
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = "rgba(255, 77, 28, 0.62)";
    g.lineWidth = 0.05 * PX;
    traces.forEach((t) => { g.beginPath(); t.forEach(([x, z], i) => (i ? g.lineTo(cx(x), cz(z)) : g.moveTo(cx(x), cz(z)))); g.stroke(); });
    g.fillStyle = "rgba(255, 77, 28, 0.85)";
    traces.forEach((t) => [t[0], t[t.length - 1]].forEach(([x, z]) => { g.beginPath(); g.arc(cx(x), cz(z), 0.045 * PX, 0, Math.PI * 2); g.fill(); }));

    // white silkscreen
    const ink = "rgba(240, 240, 240, 0.92)";
    g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 0.018 * PX;
    const outline = (x, z, w, d) => g.strokeRect(cx(x - w / 2), cz(z - d / 2), w * PX, d * PX);
    outline(0, (HEADER_Z[0] + HEADER_Z[1]) / 2, 5.3, 0.7);
    outline(MCU.x, MCU.z, MCU.s + 0.24, MCU.s + 0.24);
    outline(0.8, 0.0, 1.05, 0.7);
    outline(0.9, 1.45, 1.3, 0.9);
    SERVO_X.forEach((x) => outline(x, SERVO_Z, 0.64, 0.64));
    HOLES.forEach(([x, z]) => { g.beginPath(); g.arc(cx(x), cz(z), 0.27 * PX, 0, Math.PI * 2); g.stroke(); });

    const text = (s, x, z, size, opts = {}) => {
      g.save();
      g.font = `${opts.weight || 500} ${size * PX}px ${opts.family || '"Geist", sans-serif'}`;
      g.fillStyle = opts.color || ink;
      g.textAlign = opts.align || "left"; g.textBaseline = "middle";
      if (opts.spacing) g.letterSpacing = opts.spacing;
      g.fillText(s, cx(x), cz(z));
      g.restore();
    };
    text("AETHER", 1.55, -0.62, 0.62, { weight: 700, spacing: "4px" });
    text("SIGNAL BOARD", 1.6, -0.08, 0.17, { weight: 500, spacing: "10px", color: "rgba(240,240,240,0.7)" });
    text("AE-01", 1.6, 0.4, 0.24, { family: '"Doto", monospace', weight: 900, color: "#ff4d1c" });
    text("REV A", 2.75, 0.4, 0.13, { family: '"Geist Mono", monospace', color: "rgba(240,240,240,0.6)" });
    ["S1", "S2", "S3", "S4"].forEach((s, i) => text(s, SERVO_X[i], SERVO_Z - 0.48, 0.15, { align: "center", family: '"Geist Mono", monospace' }));
    text("J1 · 40-PIN", -2.6, -1.82, 0.13, { family: '"Geist Mono", monospace', color: "rgba(240,240,240,0.7)" });
    ["5V", "GND", "SDA", "SCL", "TX", "RX", "PWM", "3V3"].forEach((s, i) => text(s, pinX(4 + i * 2), -1.95, 0.085, { align: "center", family: '"Geist Mono", monospace', color: "rgba(240,240,240,0.65)" }));
    text("U1", MCU.x - MCU.s / 2 - 0.05, MCU.z - MCU.s / 2 - 0.22, 0.13, { family: '"Geist Mono", monospace' });
    text("USB-C", -3.95, 1.25, 0.12, { family: '"Geist Mono", monospace', align: "center" });
    text("PWR  ACT  SIG", -3.25, -1.95, 0.1, { family: '"Geist Mono", monospace', align: "center", color: "rgba(240,240,240,0.7)" });
    text("RST", -3.55, 1.95, 0.11, { family: '"Geist Mono", monospace', align: "center" });
    // the hero's corner letters, tiny, by the mounting holes
    [["A", -1, -1], ["E", 1, -1], ["E", -1, 1], ["R", 1, 1]].forEach(([l, sx, sz]) =>
      text(l, sx * (BW / 2 - 0.82), sz * (BD / 2 - 0.36), 0.2, { family: '"Instrument Serif", serif', weight: 400, align: "center" }));
    silkTex.needsUpdate = true;
  }
  paintSilk();
  if (document.fonts) {
    Promise.all(['700 40px "Geist"', '900 40px "Doto"', '500 40px "Geist Mono"', '400 40px "Instrument Serif"'].map((f) => document.fonts.load(f).catch(() => null)))
      .then(paintSilk);
  }

  // ── parts
  const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45, metalness: 0.1 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.7 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.28, metalness: 1.0 });
  const white = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.55 });
  const part = (w, h, d, mat, x, z, y = TOP) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    board.add(m);
    return m;
  };

  // main chip, with its own marking on top
  (function mainChip() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const q = c.getContext("2d");
    const paint = () => {
      q.fillStyle = "#151515"; q.fillRect(0, 0, 256, 256);
      q.fillStyle = "#ff4d1c"; q.beginPath(); q.arc(30, 30, 9, 0, Math.PI * 2); q.fill();
      q.fillStyle = "rgba(235,235,235,0.9)"; q.font = '700 40px "Geist", sans-serif'; q.textAlign = "center"; q.fillText("AETHER", 128, 124);
      q.fillStyle = "rgba(235,235,235,0.55)"; q.font = '500 22px "Geist Mono", monospace'; q.fillText("AE32 · 2026", 128, 164);
      t.needsUpdate = true;
    };
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    paint();
    if (document.fonts) document.fonts.ready.then(paint);
    const top = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.1 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(MCU.s, 0.14, MCU.s), [black, black, top, black, black, black]);
    m.position.set(MCU.x, TOP + 0.07, MCU.z);
    board.add(m);
    // pins on all four sides
    const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.03, 0.12), metal, 48);
    const o = new THREE.Object3D(); let k = 0;
    for (let side = 0; side < 4; side++) for (let i = 0; i < 12; i++) {
      const a = -MCU.s / 2 + 0.16 + i * ((MCU.s - 0.32) / 11), e = MCU.s / 2 + 0.05;
      const [x, z, r] = [[a, -e, 0], [e, a, Math.PI / 2], [a, e, 0], [-e, a, Math.PI / 2]][side];
      o.position.set(MCU.x + x, TOP + 0.015, MCU.z + z); o.rotation.set(0, r, 0); o.updateMatrix();
      legs.setMatrixAt(k++, o.matrix);
    }
    board.add(legs);
  })();

  part(1.0, 0.1, 0.62, black, 0.8, 0.0);                       // flash
  part(1.2, 0.12, 0.8, black, 0.9, 1.45);                      // servo driver
  const xtal = part(0.55, 0.13, 0.26, metal, -2.6, -0.75);      // crystal
  xtal.geometry = new THREE.CapsuleGeometry(0.12, 0.32, 4, 12); xtal.rotation.z = Math.PI / 2; xtal.position.y = TOP + 0.12;
  part(0.62, 0.14, 0.52, black, -3.0, 1.9);                    // regulator
  part(0.4, 0.04, 0.3, metal, -3.0, 2.2);                      //   …and its tab

  // 40-pin header
  part(5.15, 0.25, 0.52, plastic, 0, (HEADER_Z[0] + HEADER_Z[1]) / 2);
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.064, 0.62, 0.064), metal, 40);
  const op = new THREE.Object3D();
  for (let i = 0; i < 20; i++) for (let r = 0; r < 2; r++) {
    op.position.set(pinX(i), TOP + 0.31, HEADER_Z[r]); op.updateMatrix(); pins.setMatrixAt(i * 2 + r, op.matrix);
  }
  board.add(pins);

  // servo connectors: white housings, three dark sockets each
  SERVO_X.forEach((x) => {
    part(0.58, 0.5, 0.58, white, x, SERVO_Z);
    for (let i = -1; i <= 1; i++) part(0.12, 0.02, 0.12, plastic, x + i * 0.16, SERVO_Z, TOP + 0.5);
  });

  // USB-C, overhanging the edge like the real thing
  const usb = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.6, 4, 16), metal);
  usb.rotation.set(Math.PI / 2, 0, 0); usb.scale.set(2.2, 1, 0.6);   // long side along the edge, opening facing out
  usb.position.set(-4.05, TOP + 0.1, 0.55);
  board.add(usb);

  // reset button: black base, orange cap
  part(0.36, 0.12, 0.36, plastic, -3.55, 1.6);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20), new THREE.MeshStandardMaterial({ color: 0xff4d1c, roughness: 0.4 }));
  cap.position.set(-3.55, TOP + 0.15, 1.6); board.add(cap);

  // passives scattered around the main chip
  [[-0.2, -0.5], [-0.2, -0.3], [0.05, 1.7], [0.25, 1.95], [-2.2, 1.2], [-2.0, 1.2], [-1.8, 1.2], [-2.55, -1.3], [-2.35, -1.3], [0.55, -0.6], [0.75, -0.6], [3.7, -1.35]]
    .forEach(([x, z], i) => part(0.2, 0.08, 0.1, i % 3 ? white : black, x, z));

  // status LEDs: they blink
  const leds = [[-3.55, 0xff4d1c], [-3.25, 0xffffff], [-2.95, 0xff4d1c]].map(([x, c]) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: c, emissiveIntensity: 0.2, roughness: 0.3 });
    part(0.2, 0.07, 0.12, mat, x, -1.62);
    return mat;
  });

  // ── signal pulses riding the traces
  const segs = traces.map((t) => {
    const pts = t.map(([x, z]) => new THREE.Vector3(x, TOP + 0.05, z));
    let len = 0; const cum = [0];
    for (let i = 1; i < pts.length; i++) { len += pts[i].distanceTo(pts[i - 1]); cum.push(len); }
    return { pts, cum, len };
  });
  const glow = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const q = c.getContext("2d"); const gr = q.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,240,230,1)"); gr.addColorStop(0.25, "rgba(255,110,60,0.9)"); gr.addColorStop(1, "rgba(255,77,28,0)");
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const PULSES = 14;
  const pulseGeo = new THREE.BufferGeometry();
  const pulsePos = new Float32Array(PULSES * 3);
  pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
  board.add(new THREE.Points(pulseGeo, new THREE.PointsMaterial({ map: glow, size: 0.42, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  const pulses = Array.from({ length: PULSES }, (_, i) => ({ seg: i % segs.length, t: Math.random(), speed: 0.35 + Math.random() * 0.3 }));
  function pointOn(seg, t, out) {
    const d = t * seg.len;
    let i = 1; while (i < seg.cum.length - 1 && seg.cum[i] < d) i++;
    const a = seg.pts[i - 1], b = seg.pts[i];
    const k = (d - seg.cum[i - 1]) / (seg.cum[i] - seg.cum[i - 1] || 1);
    out[0] = a.x + (b.x - a.x) * k; out[1] = a.y; out[2] = a.z + (b.z - a.z) * k;
  }

  // ── a dotted floor and a soft contact shadow
  (function floor() {
    const p = [];
    for (let x = -9; x <= 9; x += 0.45) for (let z = -6; z <= 6; z += 0.45) if (x * x / 81 + z * z / 36 < 1) p.push(x, -0.02, z);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9a9a9a, size: 0.045, transparent: true, opacity: 0.55 })));
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const q = c.getContext("2d"); const gr = q.createRadialGradient(128, 128, 20, 128, 128, 128);
    gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    q.fillStyle = gr; q.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(BW * 1.5, BD * 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.01;
    board.add(shadow);
  })();

  // ── framing: keep the board in the upper right, where the terminal doesn't cover it
  function frame() {
    const a = W() / H();
    camera.aspect = a;
    const dist = a < 0.7 ? 27 : a < 1 ? 23.5 : a < 1.3 ? 19.5 : 17;
    camera.position.set(0, dist * 0.62, dist * 0.78);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.clearViewOffset();
    camera.setViewOffset(W(), H(), 0, -H() * 0.03, W(), H());   // a touch low, clear of the label
    renderer.setSize(W(), H());
  }
  frame();
  new ResizeObserver(frame).observe(mount);

  // ── drag to turn
  let yaw = -0.9, yawTarget = -0.9, dragging = false, lastX = 0;
  const dom = renderer.domElement;
  dom.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; dom.setPointerCapture(e.pointerId); dom.style.cursor = "grabbing"; });
  dom.addEventListener("pointerup", (e) => { dragging = false; try { dom.releasePointerCapture(e.pointerId); } catch (err) {} dom.style.cursor = "grab"; });
  dom.addEventListener("pointermove", (e) => { if (!dragging) return; yawTarget += (e.clientX - lastX) * 0.008; lastX = e.clientX; });

  let inView = false;
  new IntersectionObserver((es) => es.forEach((e) => { inView = e.isIntersecting; }), { threshold: 0 }).observe(mount);
  const clock = new THREE.Clock();
  const tmp = [0, 0, 0];
  function loop() {
    const dt = Math.min(0.05, clock.getDelta());
    if (inView && !document.hidden) {
      const t = clock.elapsedTime;
      if (!dragging && !reduce) yawTarget += (Math.sin(t * 0.22) * 0.0016);
      yaw += (yawTarget - yaw) * 0.08;
      board.rotation.y = yaw;
      board.rotation.x = reduce ? 0 : Math.sin(t * 0.3) * 0.02;

      leds.forEach((m, i) => { m.emissiveIntensity = reduce ? 0.8 : 0.25 + Math.max(0, Math.sin(t * (2.2 + i * 1.3) + i)) * 1.6; });

      pulses.forEach((p, i) => {
        if (!reduce) p.t += (dt * p.speed) / Math.max(0.6, segs[p.seg].len) * 2.2;
        if (p.t > 1) { p.t = 0; p.seg = (p.seg + 5) % segs.length; }
        pointOn(segs[p.seg], p.t, tmp);
        pulsePos[i * 3] = tmp[0]; pulsePos[i * 3 + 1] = tmp[1]; pulsePos[i * 3 + 2] = tmp[2];
      });
      pulseGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  }
  loop();
})();
