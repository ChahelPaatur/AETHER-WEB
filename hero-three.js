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
      // Global build progress · spans from the top of #safety to the bottom of
      // #bench. Both sticky towers share it, so the build is one continuous
      // motion across the two white sections that carry it.
      const startEl = document.getElementById("safety");
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
  initConstructionBg("lightBg-safety",   "safety",   { side: "left"  });
  initConstructionBg("lightBg-bench",    "bench",    { side: "right" });
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
