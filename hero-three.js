(function () {
  if (!window.THREE) { console.warn("THREE.js failed to load"); return; }

  /* ─────────────────────────────────────────────
     HERO SCENE · slow rotating dotted torus knot
     ───────────────────────────────────────────── */
  (function initHero() {
    const mount = document.getElementById("three-hero");
    if (!mount) return;

    const w = () => mount.clientWidth || window.innerWidth;
    const h = () => mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w()/h(), 0.1, 100);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w(), h());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    // Build dense torus knot, then extract vertices as points
    const knot = new THREE.TorusKnotGeometry(3.2, 0.95, 380, 28);
    const pos = knot.attributes.position;

    // Use a fresh BufferGeometry that just references the positions
    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute("position", pos);

    const ptsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.022,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const knotPts = new THREE.Points(ptsGeo, ptsMat);
    scene.add(knotPts);

    // Halo of tiny stars
    const starCount = 600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 8 + Math.random() * 6;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos[i*3]   = r * Math.sin(p) * Math.cos(t);
      starPos[i*3+1] = r * Math.sin(p) * Math.sin(t);
      starPos[i*3+2] = r * Math.cos(p);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xff4d1c,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Mouse parallax
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    window.addEventListener("mousemove", (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function resize() {
      camera.aspect = w() / h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
    }
    window.addEventListener("resize", resize);

    let visible = true;
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; });

    function loop() {
      if (visible) {
        current.x += (target.x - current.x) * 0.04;
        current.y += (target.y - current.y) * 0.04;
        knotPts.rotation.y += 0.0025;
        knotPts.rotation.x = current.y * 0.4;
        knotPts.rotation.z = -current.x * 0.4;
        stars.rotation.y -= 0.0006;
        stars.rotation.x += 0.0003;
        renderer.render(scene, camera);
      }
      requestAnimationFrame(loop);
    }
    loop();
  })();

  /* ─────────────────────────────────────────────────────────
     ARCH SCENE · high-fidelity 6-axis robotic arm, SCROLL-DRIVEN
     The arm's full pick-and-place sequence is driven by the user's
     scroll progress through the architecture section (0..1).
     ───────────────────────────────────────────────────────── */
  (function initArch() {
    const mount = document.getElementById("three-scene");
    const section = document.getElementById("arch");
    if (!mount || !section) return;

    const w = () => mount.clientWidth || mount.parentElement.clientWidth;
    const h = () => mount.clientHeight || mount.parentElement.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, w()/h(), 0.1, 100);
    camera.position.set(4.2, 2.6, 6.8);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w(), h());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";

    // ── Lighting only affects standard-material parts (joints).
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(4, 6, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff4d1c, 0.3);
    rim.position.set(-4, 2, -4); scene.add(rim);

    // ── Materials. Mix of dotted points, wireframe edges, and subtle
    //    standard surfaces so segments read as solid objects.
    const WHITE = 0xffffff, ACCENT = 0xff4d1c, DARK = 0x0a0a0a;
    const wireMat   = new THREE.LineBasicMaterial({ color: 0xb8b8b8, transparent: true, opacity: 0.55 });
    const wireAccent= new THREE.LineBasicMaterial({ color: ACCENT,   transparent: true, opacity: 0.85 });
    const pointMat  = new THREE.PointsMaterial({ color: WHITE,  size: 0.018, transparent: true, opacity: 0.6,  depthWrite: false, blending: THREE.AdditiveBlending });
    const surfMat   = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.9 });
    const surfAccent= new THREE.MeshStandardMaterial({ color: 0x1a0a05, roughness: 0.5, metalness: 0.6, emissive: 0x2a0d04, emissiveIntensity: 0.6 });

    // Builds a "segment": solid mesh + wire edges + point cloud overlay.
    function makeSeg(geom, opts = {}) {
      const g = new THREE.Group();
      const surf = new THREE.Mesh(geom, opts.accent ? surfAccent : surfMat);
      surf.renderOrder = 1;
      g.add(surf);
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom, 18), opts.accent ? wireAccent : wireMat));
      // sparse point overlay only for larger pieces to avoid clutter
      if (opts.points !== false) g.add(new THREE.Points(geom, pointMat));
      g.userData.dispose = () => { geom.dispose(); };
      return g;
    }

    // ── Root + chain
    const root = new THREE.Group();
    scene.add(root);

    // Ground: large dotted disc + concentric ticks
    const groundGroup = new THREE.Group();
    const groundPts = [];
    for (let r = 0.5; r <= 3.2; r += 0.28) {
      const segs = Math.max(16, Math.round(r * 22));
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        groundPts.push(Math.cos(a) * r, 0, Math.sin(a) * r);
      }
    }
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute("position", new THREE.Float32BufferAttribute(groundPts, 3));
    const ground = new THREE.Points(gGeo, new THREE.PointsMaterial({ color: 0x666666, size: 0.035, transparent: true, opacity: 0.45 }));
    groundGroup.add(ground);

    // Concentric working-circle indicators (faint)
    for (let i = 0; i < 3; i++) {
      const r = 1.0 + i * 0.85;
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setAttribute("position",
          new THREE.Float32BufferAttribute(
            Array.from({length: 64*3}, (_, k) => {
              const seg = Math.floor(k/3), comp = k%3;
              const a = (seg/64) * Math.PI*2;
              return comp === 0 ? Math.cos(a)*r : (comp === 1 ? 0 : Math.sin(a)*r);
            }), 3)),
        new THREE.LineBasicMaterial({ color: i === 1 ? ACCENT : 0x2a2a2a, transparent: true, opacity: i === 1 ? 0.35 : 0.4 })
      );
      groundGroup.add(ring);
    }
    groundGroup.position.y = -1.5;
    root.add(groundGroup);

    // Base plinth · wider lathed bevel
    const basePoints = [];
    basePoints.push(new THREE.Vector2(0.0,  0.0));
    basePoints.push(new THREE.Vector2(0.78, 0.0));
    basePoints.push(new THREE.Vector2(0.78, 0.08));
    basePoints.push(new THREE.Vector2(0.66, 0.16));
    basePoints.push(new THREE.Vector2(0.62, 0.30));
    basePoints.push(new THREE.Vector2(0.62, 0.34));
    basePoints.push(new THREE.Vector2(0.0,  0.34));
    const baseGeom = new THREE.LatheGeometry(basePoints, 24);
    const base = makeSeg(baseGeom);
    base.position.y = -1.5;
    root.add(base);

    // ── J1 (base yaw) at top of plinth
    const j1 = new THREE.Group();
    j1.position.y = -1.16;
    root.add(j1);

    // Shoulder collar (lathed)
    const collarPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.42, 0.0),
      new THREE.Vector2(0.42, 0.10),
      new THREE.Vector2(0.50, 0.18),
      new THREE.Vector2(0.50, 0.34),
      new THREE.Vector2(0.42, 0.42),
      new THREE.Vector2(0.42, 0.5),
      new THREE.Vector2(0.0, 0.5),
    ];
    const collar = makeSeg(new THREE.LatheGeometry(collarPts, 22));
    j1.add(collar);

    // Shoulder joint hub (accent ring)
    const shoulderHub = makeSeg(new THREE.TorusGeometry(0.32, 0.07, 12, 24), { accent: true });
    shoulderHub.position.y = 0.5;
    shoulderHub.rotation.x = Math.PI / 2;
    j1.add(shoulderHub);

    // ── J2 (shoulder pitch)
    const j2 = new THREE.Group();
    j2.position.y = 0.5;
    j1.add(j2);

    // Lower arm · capsule built from cylinder + two spheres
    function makeLink(length, radius, accentTip = false) {
      const g = new THREE.Group();
      const cyl = makeSeg(new THREE.CylinderGeometry(radius, radius, length, 16, 1, false));
      cyl.position.y = length / 2;
      g.add(cyl);
      // sphere caps
      const cap1 = makeSeg(new THREE.SphereGeometry(radius * 1.05, 16, 12));
      cap1.position.y = 0; g.add(cap1);
      const cap2 = makeSeg(new THREE.SphereGeometry(radius * 1.05, 16, 12), { accent: accentTip });
      cap2.position.y = length; g.add(cap2);
      // spec bands
      for (let i = 1; i <= 2; i++) {
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(radius * 1.08, 0.012, 8, 24),
          new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.7 })
        );
        band.position.y = (length / 3) * i;
        band.rotation.x = Math.PI / 2;
        g.add(band);
      }
      return g;
    }

    const lower = makeLink(1.55, 0.17, true);
    j2.add(lower);

    // ── J3 (elbow)
    const j3 = new THREE.Group();
    j3.position.y = 1.55;
    j2.add(j3);

    const elbowHub = makeSeg(new THREE.TorusGeometry(0.22, 0.06, 12, 22), { accent: true });
    elbowHub.rotation.x = Math.PI / 2;
    j3.add(elbowHub);

    // ── upper arm
    const j3b = new THREE.Group(); j3.add(j3b);
    const upper = makeLink(1.25, 0.13);
    j3b.add(upper);

    // ── J4 (wrist pitch)
    const j4 = new THREE.Group();
    j4.position.y = 1.25;
    j3b.add(j4);

    const wristHub = makeSeg(new THREE.TorusGeometry(0.16, 0.045, 10, 18), { accent: true });
    wristHub.rotation.x = Math.PI / 2;
    j4.add(wristHub);

    // ── J5 (wrist roll)
    const j5 = new THREE.Group();
    j4.add(j5);

    // Wrist housing · short capsule
    const wristHousing = makeLink(0.35, 0.11);
    j5.add(wristHousing);

    // ── J6 + gripper
    const j6 = new THREE.Group();
    j6.position.y = 0.35;
    j5.add(j6);

    const flange = makeSeg(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 18), { accent: true });
    flange.position.y = 0.04;
    j6.add(flange);

    // Gripper base
    const gripperBase = makeSeg(new THREE.BoxGeometry(0.28, 0.12, 0.18));
    gripperBase.position.y = 0.14;
    j6.add(gripperBase);

    // Fingers · slide along x
    function makeFinger() {
      const g = new THREE.Group();
      const top = makeSeg(new THREE.BoxGeometry(0.04, 0.06, 0.14));
      top.position.y = 0.03;
      g.add(top);
      const blade = makeSeg(new THREE.BoxGeometry(0.04, 0.22, 0.12), { accent: true });
      blade.position.y = 0.17;
      g.add(blade);
      // tip pad
      const tip = makeSeg(new THREE.BoxGeometry(0.03, 0.03, 0.14));
      tip.position.set(0, 0.29, 0);
      g.add(tip);
      return g;
    }
    const fingerL = makeFinger();
    const fingerR = makeFinger();
    j6.add(fingerL, fingerR);

    // Payload cube (held by gripper)
    const payload = (() => {
      const g = new THREE.Group();
      const geom = new THREE.BoxGeometry(0.26, 0.26, 0.26);
      g.add(new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0x1f0a04, roughness: 0.6, metalness: 0.4, emissive: 0xff4d1c, emissiveIntensity: 0.18 })));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom), wireAccent));
      g.add(new THREE.Points(geom, new THREE.PointsMaterial({ color: ACCENT, size: 0.025, transparent: true, opacity: 0.8 })));
      return g;
    })();
    scene.add(payload);
    payload.position.set(1.55, -1.28, 0);

    // Pickup / drop pads
    function pad(x, z, label) {
      const g = new THREE.Group();
      for (let r = 0.20; r <= 0.32; r += 0.06) {
        const segs = 36;
        const arr = new Float32Array(segs * 3);
        for (let i = 0; i < segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          arr[i*3] = Math.cos(a) * r;
          arr[i*3+1] = 0;
          arr[i*3+2] = Math.sin(a) * r;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        g.add(new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.5 })));
      }
      g.position.set(x, -1.49, z);
      return g;
    }
    root.add(pad( 1.55, 0));
    root.add(pad(-1.55, 0));

    // Workspace ticks
    const ticks = new THREE.Group();
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r = 3.0, len = (i % 6 === 0) ? 0.18 : 0.07;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const tg = new THREE.BufferGeometry();
      tg.setAttribute("position", new THREE.Float32BufferAttribute(
        [x, -1.5, z, x + Math.cos(a)*len, -1.5, z + Math.sin(a)*len], 3));
      const m = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({
        color: i % 6 === 0 ? ACCENT : 0x4a4a4a,
        transparent: true, opacity: i % 6 === 0 ? 0.85 : 0.5
      }));
      ticks.add(m);
    }
    root.add(ticks);

    // ── DRAG controls
    const rot = { x: -0.12, y: 0.0 };
    const tgt = { x: -0.12, y: 0.0 };
    let isDown = false, lastX = 0, lastY = 0;
    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", (e) => { isDown = true; lastX = e.clientX; lastY = e.clientY; dom.setPointerCapture(e.pointerId); dom.style.cursor = "grabbing"; });
    dom.addEventListener("pointerup",   (e) => { isDown = false; try { dom.releasePointerCapture(e.pointerId); } catch(e2) {} dom.style.cursor = "grab"; });
    dom.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      tgt.y += (e.clientX - lastX) * 0.005;
      tgt.x += (e.clientY - lastY) * 0.005;
      tgt.x = Math.max(-0.5, Math.min(0.5, tgt.x));
      lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener("resize", () => {
      camera.aspect = w() / h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
    });

    // ── Keyframe sequence · arm bends down to pick up cube on right pad,
    //    lifts it up, then loops back down. Simple pick-and-lift only.
    const kf = [
      { p: 0.00, j1: 0.55, j2: 0.95, j3: -1.60, j4: 0.15, j5: 0.0, j6: 0.0, grip: 0.14 }, // bent down, gripper OPEN above cube
      { p: 0.18, j1: 0.55, j2: 0.95, j3: -1.60, j4: 0.15, j5: 0.0, j6: 0.0, grip: 0.05 }, // GRIP closes around cube
      { p: 0.35, j1: 0.55, j2: 0.75, j3: -1.40, j4: 0.00, j5: 0.0, j6: 0.0, grip: 0.05 }, // begin lift
      { p: 0.55, j1: 0.55, j2: 0.40, j3: -1.00, j4: -0.30, j5: 0.0, j6: 0.0, grip: 0.05 }, // mid lift
      { p: 0.75, j1: 0.55, j2: 0.20, j3: -0.65, j4: -0.45, j5: 0.0, j6: 0.0, grip: 0.05 }, // fully raised
      { p: 1.00, j1: 0.55, j2: 0.20, j3: -0.65, j4: -0.45, j5: 0.0, j6: 0.0, grip: 0.05 }, // hold at top
    ];

    function easeInOut(t) { return t*t*(3 - 2*t); }
    function sampleKF(p) {
      p = Math.max(0, Math.min(1, p));
      let i = 0; while (i < kf.length - 1 && kf[i+1].p < p) i++;
      const a = kf[i], b = kf[i+1] || kf[i];
      const span = b.p - a.p || 1;
      const u = easeInOut(Math.max(0, Math.min(1, (p - a.p) / span)));
      const lerp = (k) => a[k] + (b[k] - a[k]) * u;
      return { j1: lerp("j1"), j2: lerp("j2"), j3: lerp("j3"), j4: lerp("j4"), j5: lerp("j5"), j6: lerp("j6"), grip: lerp("grip"), phase: i };
    }

    // ── SCROLL PROGRESS · 0 when arch section enters viewport bottom,
    //    1 when it leaves the top. Smoothed each frame.
    let rawProgress = 0;
    let smoothProgress = 0;
    function updateProgress() {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // start when top of section reaches 80% of viewport, end when bottom reaches 20%
      const start = vh * 0.8;
      const end   = -r.height + vh * 0.2;
      rawProgress = Math.max(0, Math.min(1, (start - r.top) / (start - end)));
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    // For payload follow:
    const tmpV = new THREE.Vector3();
    function gripperWorldPos(out) {
      tmpV.set(0, 0.34, 0); // center between fingertips
      j6.updateMatrixWorld(true);
      out.copy(j6.localToWorld(tmpV));
      return out;
    }

    // Idle subtle motion when not scrolling · keeps the rig alive
    let visible = true;
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
    let inView = false;
    new IntersectionObserver((es) => es.forEach((e) => inView = e.isIntersecting), { threshold: 0.01 }).observe(mount);

    function loop() {
      if (visible && inView) {
        // ease scroll → animation progress
        smoothProgress += (rawProgress - smoothProgress) * 0.12;

        const s = sampleKF(smoothProgress);
        j1.rotation.y = s.j1;
        j2.rotation.z = s.j2;
        j3b.rotation.z = s.j3;
        j4.rotation.z = s.j4;
        j5.rotation.y = s.j5;
        j6.rotation.z = s.j6;
        fingerL.position.x = -s.grip;
        fingerR.position.x =  s.grip;

        // Payload follow: starts on R pad. Once grip closes (phase >= 1),
        //   follows gripper for the rest of the animation.
        if (s.phase >= 1) {
          gripperWorldPos(payload.position);
          j6.getWorldQuaternion(payload.quaternion);
        } else {
          // pre-grip · sits on right pad
          payload.position.set(1.55, -1.28, 0);
          payload.quaternion.identity();
        }

        // Drag rotation around the whole rig
        rot.x += (tgt.x - rot.x) * 0.08;
        rot.y += (tgt.y - rot.y) * 0.08;
        root.rotation.x = rot.x;
        root.rotation.y = rot.y;

        renderer.render(scene, camera);
      }
      requestAnimationFrame(loop);
    }
    loop();

    // Expose progress to the UI badge on the canvas
    window.__archProgress = () => smoothProgress;
  })();

  /* ─────────────────────────────────────────────────────────
     LIGHT-SECTION BACKGROUNDS · "robotic construction" theme.
     Grid of dotted vertical columns that grow/shrink in a
     ripple pattern as you scroll past. Plus a slow rotating
     crane beam. Replaces the wave-field.
     ───────────────────────────────────────────────────────── */
  function initConstructionBg(mountId, sectionId, opts = {}) {
    const wrapper = document.getElementById(mountId);
    const section = document.getElementById(sectionId);
    if (!wrapper || !section) return;
    const mount = wrapper.querySelector(".light-bg-sticky") || wrapper;

    const W = () => mount.clientWidth  || 600;
    const H = () => mount.clientHeight || 600;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, W()/H(), 0.1, 2000);
    camera.position.set(0, 70, 320);
    camera.lookAt(0, 70, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    // ── Build target positions for a Burj Khalifa silhouette
    function buildTargets() {
      const T = [];

      // Hexagonal core
      const coreR = 4.2, coreSides = 6;
      for (let y = 0; y <= 110; y += 1.1) {
        for (let s = 0; s < coreSides; s++) {
          const a = (s / coreSides) * Math.PI * 2;
          T.push({ x: Math.cos(a) * coreR, y, z: Math.sin(a) * coreR, kind: "edge" });
        }
      }

      // Three buttressed wings with progressive setbacks
      const wingAngles = [0, Math.PI * 2/3, Math.PI * 4/3];
      const setbacks   = [22, 34, 44, 54, 63, 72, 80, 88, 96];
      wingAngles.forEach((wa) => {
        const c = Math.cos(wa), s = Math.sin(wa);
        const pc = Math.cos(wa + Math.PI/2), ps = Math.sin(wa + Math.PI/2);
        const wingMax = 22, wingW = 4.2, n = setbacks.length;
        for (let p = 0; p < n; p++) {
          const start = coreR + (n - 1 - p) / n * (wingMax - coreR);
          const end   = coreR + (n - p)     / n * (wingMax - coreR);
          const topY  = setbacks[p];
          for (let y = 0; y <= topY; y += 1.2) {
            for (const side of [-1, 1]) {
              T.push({ x: c*(end-0.2) + pc*side*wingW, y, z: s*(end-0.2) + ps*side*wingW, kind: "edge" });
            }
          }
          for (let r = start; r <= end; r += 1.0) {
            for (let ly = -wingW; ly <= wingW; ly += 1.2) {
              T.push({ x: c*r + pc*ly, y: topY, z: s*r + ps*ly, kind: "edge" });
            }
          }
          for (let y = 1.4; y < topY - 0.5; y += 2.4) {
            for (let ly = -wingW + 0.8; ly <= wingW - 0.8; ly += 1.6) {
              T.push({ x: c*(end + 0.05) + pc*ly, y, z: s*(end + 0.05) + ps*ly, kind: "window" });
            }
          }
        }
      });

      // Upper cylindrical tower
      for (let y = 110; y <= 138; y += 0.85) {
        const t = (y - 110) / 28;
        const r = 3.8 + (1.6 - 3.8) * t;
        const segs = Math.max(8, Math.floor(r * 7));
        for (let i = 0; i < segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          T.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, kind: "edge" });
        }
      }

      // 3-stage telescoping spire
      const spire = [
        { y0: 138, y1: 145, r0: 1.6, r1: 0.9 },
        { y0: 145, y1: 150, r0: 0.9, r1: 0.45 },
        { y0: 150, y1: 156, r0: 0.45, r1: 0.10 },
      ];
      spire.forEach((sg) => {
        for (let y = sg.y0; y <= sg.y1; y += 0.5) {
          const t = (y - sg.y0) / (sg.y1 - sg.y0);
          const r = sg.r0 + (sg.r1 - sg.r0) * t;
          const segs = Math.max(4, Math.floor(r * 8));
          for (let i = 0; i < segs; i++) {
            const a = (i / segs) * Math.PI * 2;
            T.push({ x: Math.cos(a) * r, y, z: Math.sin(a) * r, kind: "spire" });
          }
        }
      });
      T.push({ x: 0, y: 156.4, z: 0, kind: "tip" });
      return T;
    }

    const targets = buildTargets();
    const N = targets.length;
    const MAX_Y = 156;

    // Instanced spheres
    const geom = new THREE.SphereGeometry(0.20, 5, 5);
    const mat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geom, mat, N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3).fill(0), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    const parts = targets.map((t) => {
      const rr = 40 + Math.random() * 60;
      const th = Math.random() * Math.PI * 2;
      const hF = t.y / MAX_Y;
      const delay = Math.max(0, Math.min(0.92, hF * 0.85 + (Math.random() * 0.06 - 0.03)));
      return {
        tx: t.x, ty: t.y, tz: t.z,
        sx: rr * Math.cos(th), sy: -1 + Math.random() * 2, sz: rr * Math.sin(th),
        kind: t.kind, phase: Math.random() * Math.PI * 2,
        delay, speed: 0.10 + Math.random() * 0.06,
      };
    });

    // Faint ground grid
    const grid = new THREE.GridHelper(500, 50, 0x14110b, 0x14110b);
    grid.material.transparent = true;
    grid.material.opacity = 0.10;
    grid.position.y = -0.5;
    scene.add(grid);

    let raw = 0, smooth = 0;
    function updateProgress() {
      // Global build progress · spans from top of #overview to bottom of #bench.
      // All three sticky towers share this so the build is one continuous
      // motion across all three white sections.
      const startEl = document.getElementById("overview");
      const endEl   = document.getElementById("bench");
      if (!startEl || !endEl) return;
      const startTop = startEl.getBoundingClientRect().top + window.scrollY;
      const endBot   = endEl.getBoundingClientRect().bottom + window.scrollY;
      const sy = window.scrollY + window.innerHeight * 0.5;
      raw = Math.max(0, Math.min(1, (sy - startTop) / (endBot - startTop)));
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    let inView = false;
    new IntersectionObserver((es) => es.forEach((e) => inView = e.isIntersecting), { threshold: 0 }).observe(mount);
    let visible = true;
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
    window.addEventListener("resize", () => {
      camera.aspect = W()/H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    });
    new ResizeObserver(() => {
      camera.aspect = W()/H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    }).observe(mount);

    const tmpM = new THREE.Matrix4();
    const tmpP = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();
    const tmpS = new THREE.Vector3();
    const tmpC = new THREE.Color();
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const clock = new THREE.Clock();
    (function loop() {
      if (visible && inView) {
        smooth += (raw - smooth) * 0.07;
        const t = clock.getElapsedTime();

        const orbit = smooth * 0.45 + Math.sin(t * 0.08) * 0.05;
        const camDist = 320 - smooth * 70;
        camera.position.x = Math.sin(orbit) * camDist;
        camera.position.z = Math.cos(orbit) * camDist;
        camera.position.y = 65 + smooth * 32;
        camera.lookAt(0, 60 + smooth * 20, 0);

        for (let i = 0; i < N; i++) {
          const p = parts[i];
          const local = Math.min(1, Math.max(0, (smooth - p.delay) / p.speed));
          const e = easeOutQuart(local);

          let x = p.sx + (p.tx - p.sx) * e;
          let y = p.sy + (p.ty - p.sy) * e;
          let z = p.sz + (p.tz - p.sz) * e;

          const drift = (1 - e) * 0.7 + 0.04;
          x += Math.sin(t * 0.7 + p.phase) * drift;
          y += Math.cos(t * 0.5 + p.phase * 1.3) * drift * 0.4;
          z += Math.sin(t * 0.6 + p.phase * 0.7) * drift;

          let r, g, b, scale;
          if (p.kind === "edge") {
            const v = 0.06 + (1 - e) * 0.4;
            r = v; g = v; b = v;
            scale = 0.75 + e * 0.45;
          } else if (p.kind === "window") {
            const v = 0.32 + (1 - e) * 0.35;
            r = v; g = v; b = v;
            scale = 0.45 + e * 0.3;
          } else if (p.kind === "spire") {
            r = 0.88; g = 0.30; b = 0.10;
            scale = 0.75 + e * 0.45;
          } else {
            r = 1.0; g = 0.30; b = 0.10;
            scale = 1.6 + e * 0.6 + Math.sin(t * 3) * 0.2;
          }

          tmpP.set(x, y, z); tmpQ.set(0,0,0,1); tmpS.set(scale, scale, scale);
          tmpM.compose(tmpP, tmpQ, tmpS);
          mesh.setMatrixAt(i, tmpM);
          tmpC.setRGB(r, g, b);
          mesh.setColorAt(i, tmpC);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        renderer.render(scene, camera);
      }
      requestAnimationFrame(loop);
    })();
  }
  initConstructionBg("lightBg-overview", "overview", { side: "right" });
  initConstructionBg("lightBg-features", "features", { side: "left"  });
  initConstructionBg("lightBg-bench",    "bench",    { side: "right" });
  /* ─────────────────────────────────────────────────────────
     PIPELINE STAGE SCENES · 4 mini canvases (Discover/Build/Plan/Execute)
     ───────────────────────────────────────────────────────── */
  function mountMini(id) {
    const mount = document.getElementById(id);
    if (!mount) return null;
    const W = () => mount.clientWidth || mount.parentElement.clientWidth;
    const H = () => mount.clientHeight || mount.parentElement.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W()/H(), 0.1, 100);
    camera.position.set(0, 0, 5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W(), H());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    let inView = false;
    new IntersectionObserver((es) => es.forEach((e) => inView = e.isIntersecting), { threshold: 0.05 }).observe(mount);
    let visible = true;
    document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
    window.addEventListener("resize", () => {
      camera.aspect = W()/H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    });
    return { scene, camera, renderer, isLive: () => visible && inView };
  }

  // Stage 1 · DISCOVER: radar sweep with particle field and device emergence
  (function stage1() {
    const ctx = mountMini("stage-c1");
    if (!ctx) return;
    const { scene, camera, renderer, isLive } = ctx;
    camera.position.set(0, 0.8, 5.5);
    camera.lookAt(0, 0, 0);

    const ACCENT = 0xff4d1c;

    // Central hub: layered icosahedron with breathing glow
    const hub = new THREE.Group();
    const hubGeo = new THREE.IcosahedronGeometry(0.42, 2);
    const hubGeo2 = new THREE.IcosahedronGeometry(0.28, 1);
    hub.add(new THREE.Points(hubGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.025, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending
    })));
    hub.add(new THREE.LineSegments(new THREE.EdgesGeometry(hubGeo),
      new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.4 })));
    hub.add(new THREE.LineSegments(new THREE.EdgesGeometry(hubGeo2),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })));
    const coreMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.5 });
    hub.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), coreMat));
    scene.add(hub);

    // Ambient particle field (dust-like)
    const dustCount = 120;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustVel = [];
    for (let i = 0; i < dustCount; i++) {
      dustPos[i*3]   = (Math.random() - 0.5) * 6;
      dustPos[i*3+1] = (Math.random() - 0.5) * 4;
      dustPos[i*3+2] = (Math.random() - 0.5) * 3;
      dustVel.push({ vx: (Math.random()-0.5)*0.003, vy: (Math.random()-0.5)*0.002, vz: (Math.random()-0.5)*0.002 });
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.018, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending
    })));

    // 8 devices with distinct shapes
    const deviceTypes = [
      { shape: "box",   color: 0xffffff },
      { shape: "torus", color: 0xff4d1c },
      { shape: "cube",  color: 0xffffff },
      { shape: "octa",  color: 0xff4d1c },
      { shape: "box",   color: 0xffffff },
      { shape: "cube",  color: 0xff4d1c },
      { shape: "octa",  color: 0xffffff },
      { shape: "torus", color: 0xff4d1c },
    ];
    const devices = [];
    const R = 2.0;
    deviceTypes.forEach((t, i) => {
      const ang = (i / deviceTypes.length) * Math.PI * 2;
      const x = Math.cos(ang) * R;
      const z = Math.sin(ang) * R * 0.55;
      const y = ((i % 3) - 1) * 0.5;
      let geom;
      switch (t.shape) {
        case "box":   geom = new THREE.BoxGeometry(0.28, 0.18, 0.18); break;
        case "cube":  geom = new THREE.BoxGeometry(0.22, 0.22, 0.22); break;
        case "torus": geom = new THREE.TorusGeometry(0.16, 0.045, 8, 16); break;
        case "octa":  geom = new THREE.OctahedronGeometry(0.18, 0); break;
        default:      geom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      }
      const g = new THREE.Group();
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom),
        new THREE.LineBasicMaterial({ color: t.color, transparent: true, opacity: 0.9 })));
      g.add(new THREE.Points(geom, new THREE.PointsMaterial({
        color: t.color, size: 0.024, transparent: true, opacity: 0.7, depthWrite: false
      })));
      g.position.set(x, y, z);
      g.userData = { home: new THREE.Vector3(x, y, z), discoverAt: 0.08 + i * 0.1 };
      g.scale.setScalar(0);
      scene.add(g);
      devices.push(g);
    });

    // Connection lines with gradient-like fade
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(devices.length * 6);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.35 });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Travelling probe pulses with glow
    const pulses = devices.map(() => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8),
        new THREE.MeshBasicMaterial({ color: ACCENT })));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.15 })));
      g.userData = { t: Math.random() };
      g.visible = false;
      scene.add(g);
      return g;
    });

    // Multiple expanding scan rings for layered radar effect
    const scanRings = [];
    for (let r = 0; r < 3; r++) {
      const scan = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 0.82, 64),
        new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      scan.rotation.x = -Math.PI / 2;
      scan.userData = { offset: r * 0.33 };
      scene.add(scan);
      scanRings.push(scan);
    }

    const clock = new THREE.Clock();
    const CYCLE = 7.0;
    (function tick() {
      if (isLive()) {
        const dt = clock.getDelta();
        const t = clock.getElapsedTime();
        const p = (t % CYCLE) / CYCLE;

        // Layered radar rings
        scanRings.forEach((scan) => {
          const sp = ((p + scan.userData.offset) % 1);
          scan.scale.setScalar(0.5 + sp * 2.0);
          scan.material.opacity = (1 - sp) * 0.5;
        });

        // Hub breathing and rotation
        hub.rotation.y += dt * 0.35;
        hub.rotation.x += dt * 0.18;
        const breathe = 1 + Math.sin(t * 1.8) * 0.08;
        hub.scale.setScalar(breathe);
        coreMat.opacity = 0.3 + Math.sin(t * 3) * 0.2;

        // Animate dust particles
        for (let i = 0; i < dustCount; i++) {
          dustPos[i*3]   += dustVel[i].vx;
          dustPos[i*3+1] += dustVel[i].vy;
          dustPos[i*3+2] += dustVel[i].vz;
          if (Math.abs(dustPos[i*3]) > 3) dustVel[i].vx *= -1;
          if (Math.abs(dustPos[i*3+1]) > 2) dustVel[i].vy *= -1;
          if (Math.abs(dustPos[i*3+2]) > 1.5) dustVel[i].vz *= -1;
        }
        dustGeo.attributes.position.needsUpdate = true;

        // Devices emerge with elastic easing
        devices.forEach((d, i) => {
          const elapsed = p - d.userData.discoverAt;
          if (elapsed < 0) {
            d.scale.setScalar(0);
            pulses[i].visible = false;
            return;
          }
          const k = Math.min(1, elapsed * 6);
          // Elastic ease out
          const eased = k === 1 ? 1 : 1 - Math.pow(2, -10 * k) * Math.cos((k * 10 - 0.75) * (2 * Math.PI / 3));
          d.scale.setScalar(eased * (1 + Math.sin(t * 2 + i) * 0.04));
          d.rotation.y += dt * (0.4 + i * 0.05);
          d.rotation.x += dt * 0.25;
          d.position.x = d.userData.home.x + Math.sin(t * 0.6 + i * 0.8) * 0.08;
          d.position.y = d.userData.home.y + Math.cos(t * 0.9 + i * 1.2) * 0.07;
          d.position.z = d.userData.home.z + Math.sin(t * 0.7 + i * 0.5) * 0.05;

          linePos[i*6]   = 0; linePos[i*6+1] = 0; linePos[i*6+2] = 0;
          linePos[i*6+3] = d.position.x;
          linePos[i*6+4] = d.position.y;
          linePos[i*6+5] = d.position.z;

          pulses[i].visible = true;
          pulses[i].userData.t += dt * 0.7;
          const pt = (pulses[i].userData.t + i * 0.12) % 1;
          pulses[i].position.set(d.position.x * pt, d.position.y * pt, d.position.z * pt);
          const pulseScale = 0.6 + 0.6 * Math.sin(pt * Math.PI);
          pulses[i].scale.setScalar(pulseScale);
        });
        lineGeo.attributes.position.needsUpdate = true;
        lineMat.opacity = 0.2 + Math.sin(t * 2) * 0.15;

        scene.rotation.y = Math.sin(t * 0.12) * 0.3;
        scene.rotation.x = Math.sin(t * 0.08) * 0.08;

        renderer.render(scene, camera);
      }
      requestAnimationFrame(tick);
    })();
  })();

  // Stage 2 · BUILD: modular blocks assemble into tower with particle welding effects
  (function stage2() {
    const ctx = mountMini("stage-c2");
    if (!ctx) return;
    const { scene, camera, renderer, isLive } = ctx;
    camera.position.set(2.4, 2.0, 4.5);
    camera.lookAt(0, 0.3, 0);

    const ACCENT = 0xff4d1c;
    const blocks = [];
    const slots = [
      { x: -0.8, y: -0.9, z: 0 },
      { x:  0.0, y: -0.9, z: 0 },
      { x:  0.8, y: -0.9, z: 0 },
      { x: -0.4, y: -0.1, z: 0 },
      { x:  0.4, y: -0.1, z: 0 },
      { x:  0.0, y:  0.7, z: 0 },
    ];

    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const size = 0.5 - i * 0.02;
      const geom = new THREE.BoxGeometry(size, size, size);
      const wireMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.8 });
      const pointMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.7, depthWrite: false });
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom), wireMat));
      g.add(new THREE.Points(geom, pointMat));
      // Add inner glow mesh
      const glowMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
      const glowMesh = new THREE.Mesh(new THREE.BoxGeometry(size * 0.85, size * 0.85, size * 0.85), glowMat);
      g.add(glowMesh);
      g.userData = { glowMat, wireMat };
      scene.add(g);
      blocks.push({ g, slot: slots[i], idx: i });
    }

    // Sparks / welding particles at join points
    const sparkCount = 60;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkVel = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i*3] = 0; sparkPos[i*3+1] = -10; sparkPos[i*3+2] = 0;
      sparkVel.push({ vx: 0, vy: 0, vz: 0, life: 0 });
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
      color: ACCENT, size: 0.04, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    scene.add(sparks);

    // Scaffold grid lines (background)
    const scaffoldGeo = new THREE.BufferGeometry();
    const sLines = [];
    for (let i = -2; i <= 2; i += 0.5) {
      sLines.push(-2, i, -1, 2, i, -1);
      sLines.push(i, -2, -1, i, 2, -1);
    }
    scaffoldGeo.setAttribute("position", new THREE.Float32BufferAttribute(sLines, 3));
    scene.add(new THREE.LineSegments(scaffoldGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.04 })));

    const clock = new THREE.Clock();
    const cycleDur = 8;
    let sparkIdx = 0;

    (function tick() {
      if (isLive()) {
        const t = clock.getElapsedTime() % cycleDur;
        const total = clock.getElapsedTime();
        scene.rotation.y = Math.sin(total * 0.15) * 0.35;

        blocks.forEach((b) => {
          const entryStart = b.idx * 0.55;
          const entryEnd = entryStart + 1.2;
          const exitStart = 6.0 + b.idx * 0.15;
          const exitEnd = exitStart + 0.9;
          let placedT = 0;
          if (t < entryStart) placedT = 0;
          else if (t < entryEnd) placedT = (t - entryStart) / (entryEnd - entryStart);
          else if (t < exitStart) placedT = 1;
          else if (t < exitEnd) placedT = 1 - (t - exitStart) / (exitEnd - exitStart);
          else placedT = 0;

          // Elastic ease for landing
          let eased;
          if (placedT < 1) {
            const c4 = (2 * Math.PI) / 3;
            eased = placedT === 0 ? 0 : placedT === 1 ? 1 :
              Math.pow(2, -10 * placedT) * Math.sin((placedT * 10 - 0.75) * c4) + 1;
          } else {
            eased = 1;
          }

          const startY = 3.0;
          const startX = (Math.random() > 0.5 ? 1 : -1) * 2.5;
          b.g.position.set(
            b.slot.x + (1 - eased) * (b.idx % 2 === 0 ? -1.5 : 1.5),
            startY + (b.slot.y - startY) * eased,
            b.slot.z
          );
          b.g.rotation.x = (1 - eased) * 0.8;
          b.g.rotation.y = (1 - eased) * 1.2;
          b.g.rotation.z = (1 - eased) * 0.4;

          // Glow on landing
          const landingProximity = Math.max(0, 1 - Math.abs(placedT - 1) * 5);
          b.g.userData.glowMat.opacity = landingProximity * 0.15;

          // Emit sparks when block lands
          if (placedT > 0.85 && placedT < 0.98) {
            for (let s = 0; s < 2; s++) {
              sparkPos[sparkIdx*3]   = b.g.position.x + (Math.random()-0.5)*0.3;
              sparkPos[sparkIdx*3+1] = b.g.position.y + (Math.random()-0.5)*0.3;
              sparkPos[sparkIdx*3+2] = b.g.position.z + (Math.random()-0.5)*0.3;
              sparkVel[sparkIdx] = {
                vx: (Math.random()-0.5)*0.06, vy: Math.random()*0.04 + 0.02,
                vz: (Math.random()-0.5)*0.04, life: 1
              };
              sparkIdx = (sparkIdx + 1) % sparkCount;
            }
          }
        });

        // Update sparks
        for (let i = 0; i < sparkCount; i++) {
          if (sparkVel[i].life > 0) {
            sparkPos[i*3]   += sparkVel[i].vx;
            sparkPos[i*3+1] += sparkVel[i].vy;
            sparkPos[i*3+2] += sparkVel[i].vz;
            sparkVel[i].vy -= 0.002;
            sparkVel[i].life -= 0.025;
          } else {
            sparkPos[i*3+1] = -10;
          }
        }
        sparkGeo.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
      }
      requestAnimationFrame(tick);
    })();
  })();

  // Stage 3 · PLAN: neural decision graph with multi-path routing & highlight cascade
  (function stage3() {
    const ctx = mountMini("stage-c3");
    if (!ctx) return;
    const { scene, camera, renderer, isLive } = ctx;
    camera.position.set(0, 0, 5);

    const ACCENT = 0xff4d1c;
    const N = 12;
    const nodes = [];
    const nodeMeshes = [];
    const nodeGlows = [];

    // Create structured node layout (3 layers: input, hidden, output)
    const layers = [
      { count: 3, x: -1.6, spread: 1.2 },
      { count: 5, x: 0, spread: 1.8 },
      { count: 4, x: 1.6, spread: 1.5 },
    ];
    layers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const y = (i - (layer.count - 1) / 2) * (layer.spread / layer.count);
        const z = (Math.random() - 0.5) * 0.8;
        const v = new THREE.Vector3(layer.x, y, z);
        nodes.push(v);

        const g = new THREE.Group();
        const isAccent = nodes.length % 3 === 0;
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 12, 12),
          new THREE.MeshBasicMaterial({ color: isAccent ? ACCENT : 0xffffff })
        );
        g.add(m);
        // Outer ring for emphasis
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.09, 0.11, 16),
          new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, side: THREE.DoubleSide })
        );
        g.add(ring);
        g.position.copy(v);
        scene.add(g);
        nodeMeshes.push(m);
        nodeGlows.push(ring);
      }
    });

    // Create edges between adjacent layers
    const edgePairs = [];
    let layerStart = 0;
    for (let l = 0; l < layers.length - 1; l++) {
      const currStart = layerStart;
      const currEnd = layerStart + layers[l].count;
      const nextStart = currEnd;
      const nextEnd = nextStart + layers[l+1].count;
      for (let i = currStart; i < currEnd; i++) {
        for (let j = nextStart; j < nextEnd; j++) {
          if (Math.random() < 0.6) edgePairs.push([i, j]);
        }
      }
      layerStart = currEnd;
    }

    const ePos = new Float32Array(edgePairs.length * 6);
    edgePairs.forEach(([a, b], k) => {
      ePos[k*6+0] = nodes[a].x; ePos[k*6+1] = nodes[a].y; ePos[k*6+2] = nodes[a].z;
      ePos[k*6+3] = nodes[b].x; ePos[k*6+4] = nodes[b].y; ePos[k*6+5] = nodes[b].z;
    });
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 });
    scene.add(new THREE.LineSegments(edgeGeo, edgeMat));

    // Multiple pulses travelling simultaneously
    const pulseCount = 4;
    const pulses = [];
    for (let i = 0; i < pulseCount; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10),
        new THREE.MeshBasicMaterial({ color: ACCENT })));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10),
        new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.2 })));
      scene.add(g);
      pulses.push({ mesh: g, edgeIdx: Math.floor(Math.random() * edgePairs.length), t: Math.random(), speed: 0.8 + Math.random() * 0.6 });
    }

    // Highlighted path edges (will animate)
    const pathGeo = new THREE.BufferGeometry();
    const pathPos = new Float32Array(edgePairs.length * 6);
    pathGeo.setAttribute("position", new THREE.BufferAttribute(pathPos, 3));
    const pathMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.6 });
    const pathLines = new THREE.LineSegments(pathGeo, pathMat);
    scene.add(pathLines);

    const clock = new THREE.Clock();
    let activePathTime = 0;
    let activePath = [];

    function pickPath() {
      activePath = [];
      let current = Math.floor(Math.random() * layers[0].count);
      activePath.push(current);
      let layerStart = layers[0].count;
      for (let l = 1; l < layers.length; l++) {
        const candidates = edgePairs.filter(([a, b]) => a === current && b >= layerStart && b < layerStart + layers[l].count);
        if (candidates.length > 0) {
          current = candidates[Math.floor(Math.random() * candidates.length)][1];
          activePath.push(current);
        }
        layerStart += layers[l].count;
      }
    }
    pickPath();

    (function tick() {
      if (isLive()) {
        const dt = clock.getDelta();
        const t = clock.getElapsedTime();

        scene.rotation.y = Math.sin(t * 0.1) * 0.2;
        scene.rotation.x = Math.sin(t * 0.15) * 0.08;

        // Update pulses
        pulses.forEach((p) => {
          p.t += dt * p.speed;
          if (p.t >= 1) {
            p.t = 0;
            p.edgeIdx = (p.edgeIdx + 1) % edgePairs.length;
          }
          const [a, b] = edgePairs[p.edgeIdx];
          p.mesh.position.lerpVectors(nodes[a], nodes[b], p.t);
          p.mesh.scale.setScalar(0.6 + 0.5 * Math.sin(p.t * Math.PI));
        });

        // Animate active path highlight
        activePathTime += dt;
        if (activePathTime > 3.0) { activePathTime = 0; pickPath(); }

        // Reset path positions
        pathPos.fill(0);
        let pIdx = 0;
        for (let i = 0; i < activePath.length - 1; i++) {
          const a = activePath[i], b = activePath[i+1];
          const fadeIn = Math.min(1, activePathTime * 2 - i * 0.3);
          if (fadeIn > 0) {
            pathPos[pIdx*6]   = nodes[a].x; pathPos[pIdx*6+1] = nodes[a].y; pathPos[pIdx*6+2] = nodes[a].z;
            pathPos[pIdx*6+3] = nodes[b].x; pathPos[pIdx*6+4] = nodes[b].y; pathPos[pIdx*6+5] = nodes[b].z;
            pIdx++;
          }
        }
        pathGeo.attributes.position.needsUpdate = true;
        pathMat.opacity = 0.4 + Math.sin(t * 4) * 0.2;

        // Node glow on active path
        nodeGlows.forEach((ring, i) => {
          const isActive = activePath.includes(i);
          ring.material.opacity += ((isActive ? 0.7 : 0) - ring.material.opacity) * 0.08;
          if (isActive) ring.rotation.z += dt * 2;
        });

        // Subtle node breathing
        nodeMeshes.forEach((m, i) => {
          m.scale.setScalar(1 + Math.sin(t * 2 + i * 0.5) * 0.12);
        });

        renderer.render(scene, camera);
      }
      requestAnimationFrame(tick);
    })();
  })();

  // Stage 4 - EXECUTE: precision targeting with FDIR loop visualization
  (function stage4() {
    const ctx = mountMini("stage-c4");
    if (!ctx) return;
    const { scene, camera, renderer, isLive } = ctx;
    camera.position.set(0, 0, 4.5);

    const ACCENT = 0xff4d1c;

    // Multi-layered targeting rings with rotation offsets
    const ringGroup = new THREE.Group();
    const ringData = [];
    for (let r = 0.4; r <= 1.5; r += 0.22) {
      const segs = 80;
      const positions = new Float32Array(segs * 3);
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        positions[i*3] = Math.cos(a) * r;
        positions[i*3+1] = Math.sin(a) * r;
        positions[i*3+2] = 0;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const op = Math.max(0.15, 1 - (r - 0.4) / 1.2);
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color: r < 0.7 ? ACCENT : 0xffffff, size: 0.03, transparent: true, opacity: op, depthWrite: false
      }));
      ringGroup.add(pts);
      ringData.push({ mesh: pts, radius: r, speed: (1.5 - r) * 0.5 + 0.2 });
    }
    scene.add(ringGroup);

    // Crosshair with dynamic sizing
    const crosshairMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.8 });
    const crosshair = new THREE.Group();
    crosshair.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position",
        new THREE.Float32BufferAttribute([-0.25,0,0, 0.25,0,0, 0,-0.25,0, 0,0.25,0], 3)), crosshairMat));
    // Corner brackets
    const brackets = [[-1,-1],[1,-1],[1,1],[-1,1]];
    brackets.forEach(([sx, sy]) => {
      const bGeo = new THREE.BufferGeometry().setAttribute("position",
        new THREE.Float32BufferAttribute([sx*0.15, sy*0.22, 0, sx*0.22, sy*0.22, 0, sx*0.22, sy*0.15, 0], 3));
      crosshair.add(new THREE.Line(bGeo, crosshairMat));
    });
    scene.add(crosshair);

    // Waypoint with glow trail
    const waypoint = new THREE.Group();
    waypoint.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshBasicMaterial({ color: ACCENT })));
    const wpGlow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12),
      new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }));
    waypoint.add(wpGlow);
    scene.add(waypoint);

    // Longer, fading trail
    const trailN = 64;
    const trailPos = new Float32Array(trailN * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPos, 3));
    scene.add(new THREE.Points(trailGeo,
      new THREE.PointsMaterial({ color: ACCENT, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));

    // Secondary trail (dimmer, larger particles)
    const trail2Pos = new Float32Array(trailN * 3);
    const trail2Geo = new THREE.BufferGeometry();
    trail2Geo.setAttribute("position", new THREE.BufferAttribute(trail2Pos, 3));
    scene.add(new THREE.Points(trail2Geo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.015, transparent: true, opacity: 0.2, depthWrite: false })));

    // Status indicators (orbiting dots representing FDIR checks)
    const statusDots = [];
    for (let i = 0; i < 5; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshBasicMaterial({ color: i < 4 ? 0x44ff44 : ACCENT, transparent: true, opacity: 0.8 })
      );
      scene.add(dot);
      statusDots.push(dot);
    }

    const clock = new THREE.Clock();
    let frameCount = 0;

    (function tick() {
      if (isLive()) {
        const t = clock.getElapsedTime();
        frameCount++;

        // Rings counter-rotate at different speeds
        ringData.forEach((rd, i) => {
          rd.mesh.rotation.z = t * rd.speed * (i % 2 === 0 ? 1 : -1);
          rd.mesh.rotation.x = Math.sin(t * 0.2 + i) * 0.15;
        });

        ringGroup.rotation.x = Math.sin(t * 0.25) * 0.2;
        ringGroup.rotation.y = Math.cos(t * 0.3) * 0.2;

        // Crosshair breathing
        const crossScale = 1 + Math.sin(t * 3) * 0.08;
        crosshair.scale.setScalar(crossScale);
        crosshair.rotation.z = Math.sin(t * 0.5) * 0.1;

        // Complex waypoint path (lissajous figure)
        const x = 1.2 * Math.cos(t * 0.9) * Math.sin(t * 0.4);
        const y = 0.8 * Math.sin(t * 1.3);
        const z = 0.5 * Math.cos(t * 0.7);
        waypoint.position.set(x, y, z);
        wpGlow.scale.setScalar(1 + Math.sin(t * 5) * 0.3);

        // Update trails (shift every other frame for performance)
        if (frameCount % 2 === 0) {
          for (let i = trailN - 1; i > 0; i--) {
            trailPos[i*3]   = trailPos[(i-1)*3];
            trailPos[i*3+1] = trailPos[(i-1)*3+1];
            trailPos[i*3+2] = trailPos[(i-1)*3+2];
            trail2Pos[i*3]   = trail2Pos[(i-1)*3];
            trail2Pos[i*3+1] = trail2Pos[(i-1)*3+1];
            trail2Pos[i*3+2] = trail2Pos[(i-1)*3+2];
          }
          trailPos[0] = x; trailPos[1] = y; trailPos[2] = z;
          trail2Pos[0] = x + (Math.random()-0.5)*0.05;
          trail2Pos[1] = y + (Math.random()-0.5)*0.05;
          trail2Pos[2] = z + (Math.random()-0.5)*0.05;
          trailGeo.attributes.position.needsUpdate = true;
          trail2Geo.attributes.position.needsUpdate = true;
        }

        // Status dots orbit the waypoint
        statusDots.forEach((dot, i) => {
          const angle = t * 2 + (i / statusDots.length) * Math.PI * 2;
          const orbitR = 0.25;
          dot.position.set(
            x + Math.cos(angle) * orbitR,
            y + Math.sin(angle) * orbitR,
            z
          );
          dot.scale.setScalar(0.8 + Math.sin(t * 4 + i) * 0.3);
        });

        renderer.render(scene, camera);
      }
      requestAnimationFrame(tick);
    })();
  })();

  /* ─────────────────────────────────────────────
     Hero LIVE pill · gently fluctuate the Hz number
     ───────────────────────────────────────────── */
  (function initLiveHz() {
    const el = document.getElementById("liveHz");
    if (!el) return;
    let base = 1280;
    setInterval(() => {
      const v = base + Math.round((Math.random() - 0.5) * 40);
      el.textContent = v.toLocaleString();
    }, 1400);
  })();
})();
