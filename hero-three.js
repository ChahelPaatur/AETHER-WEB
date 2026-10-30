(function () {
  if (!window.THREE) { console.warn("THREE.js failed to load"); return; }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ─────────────────────────────────────────────
     SKY · light rays rising out of the horizon.
     One full-screen shader: blue rays in a beam that widens toward
     the horizon, cantaloupe light pooling at its foot, a few stars
     overhead. Used by the hero, install and Cortex; the CSS sky
     underneath stands in until (or unless) it draws.
       anchor  element the hot spot follows (optional)
       glowY   height of the hot spot, 0 bottom … 1 top
       reach   how high the beam climbs before it fades (default 1.05)
       beam    brightness of the blue beam (default 1)
       fade    melt the horizon back into midnight
     ───────────────────────────────────────────── */
  function initSky(mount, opts) {
    if (!mount) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch (e) { return; }
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(scale);
    mount.appendChild(renderer.domElement);

    const uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uGlowY: { value: opts.glowY },
      uFade: { value: opts.fade ? 1 : 0 },
      uReach: { value: opts.reach || 1.05 },
      uBeam: { value: opts.beam || 1 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 uRes;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uGlowY;
        uniform float uFade;
        uniform float uReach;
        uniform float uBeam;

        float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
        float n1(float x) { float i = floor(x), f = fract(x); return mix(h1(i), h1(i + 1.0), f * f * (3.0 - 2.0 * f)); }
        float h2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

        void main() {
          float aspect = uRes.x / uRes.y;
          float y = vUv.y;
          // centred, in screen heights; portrait screens keep a narrower beam
          float x = (vUv.x - 0.5) * max(aspect, 1.15) - uMouse.x * 0.04;
          float t = uTime;

          // the rays: thin vertical streaks whose brightness drifts slowly
          float r = n1(x * 24.0 + t * 0.05) * 0.5
                  + n1(x * 67.0 - t * 0.08) * 0.32
                  + n1(x * 151.0 + t * 0.12) * 0.18;
          r = smoothstep(0.22, 0.95, r);

          vec3 midnight = vec3(0.008, 0.027, 0.039);
          vec3 blue     = vec3(0.008, 0.592, 0.871);
          vec3 ice      = vec3(0.58, 0.86, 1.0);
          vec3 orange   = vec3(0.988, 0.451, 0.302);

          // the beam: wide at the horizon, narrowing and fading upward
          float w = mix(0.95, 0.16, pow(clamp(y, 0.0, 1.0), 0.75));
          float beam = exp(-(x * x) / (w * w)) * smoothstep(uReach, 0.1, y);
          vec3 col = midnight + blue * beam * (0.16 + 1.0 * r) * uBeam;

          // a brighter core straight up the middle
          float core = exp(-(x * x) / 0.005) * smoothstep(uReach * 0.9, uGlowY - 0.05, y);
          col += ice * core * (0.22 + 0.4 * r) * uBeam;

          // cantaloupe light pooling at the horizon, rays running through it
          float ox = x / 0.95, oy = (y - uGlowY + 0.1) / 0.24;
          float pool = exp(-(ox * ox + oy * oy));
          col = mix(col, orange * (0.8 + 0.45 * r), clamp(pool * 0.92, 0.0, 1.0));

          // the hot spot behind the button
          float hx = x / 0.15, hy = (y - uGlowY) / 0.11;
          col += vec3(1.0, 0.8, 0.7) * exp(-(hx * hx + hy * hy)) * 0.42;

          // fade the horizon back to midnight so the next section joins cleanly
          col = mix(midnight, col, mix(1.0, smoothstep(0.0, 0.16, y), uFade));
          // and darken the far edges
          col = mix(col, midnight, smoothstep(0.32, 0.5, abs(vUv.x - 0.5)) * 0.55);

          // stars, only in the upper sky
          vec2 cell = floor(gl_FragCoord.xy / 3.0);
          float s = h2(cell);
          float star = step(0.9987, s) * smoothstep(0.5, 0.95, y) * (0.55 + 0.45 * sin(t * 1.4 + s * 90.0));
          col += vec3(0.75, 0.88, 1.0) * star * 0.65;

          // a little dither against banding
          col += (h2(gl_FragCoord.xy + fract(t)) - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    const camera = new THREE.Camera();

    // keep the hot spot behind its anchor, wherever the layout puts it
    const orb = opts.anchor || null;
    function resize() {
      const w = Math.max(1, mount.clientWidth), h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w, h);
      if (orb) {
        const m = mount.getBoundingClientRect(), o = orb.getBoundingClientRect();
        if (o.height) uniforms.uGlowY.value = 1 - (o.top + o.height / 2 - m.top) / m.height;
      }
    }
    resize();
    new ResizeObserver(() => { resize(); if (reduce) draw(); }).observe(mount);

    const target = { x: 0 }, mouse = { x: 0 };
    window.addEventListener("pointermove", (e) => { target.x = (e.clientX / window.innerWidth - 0.5) * 2; }, { passive: true });

    function draw() { renderer.render(scene, camera); }
    if (reduce) {
      uniforms.uTime.value = 12;
      draw();
      mount.classList.add("is-live");
      return;
    }

    let inView = true;
    new IntersectionObserver((es) => es.forEach((e) => { inView = e.isIntersecting; })).observe(mount);
    const clock = new THREE.Clock();
    let first = true;
    (function loop() {
      if (inView && !document.hidden) {
        mouse.x += (target.x - mouse.x) * 0.03;
        uniforms.uMouse.value.set(mouse.x, 0);
        uniforms.uTime.value = 12 + clock.getElapsedTime();
        draw();
        if (first) { first = false; mount.classList.add("is-live"); }
      }
      requestAnimationFrame(loop);
    })();
  }
  initSky(document.getElementById("heroSky"), { glowY: 0.16, reach: 0.78, beam: 0.62, fade: true });
  initSky(document.getElementById("installSky"), { glowY: 0.2, fade: true });
  initSky(document.getElementById("cortexSky"), { glowY: 0.17, fade: true });

  /* ─────────────────────────────────────────────
     HERO KNOT · the original slow-turning dotted torus knot,
     now in pale electric blue with cantaloupe dust around it
     ───────────────────────────────────────────── */
  (function initKnot() {
    const mount = document.getElementById("heroKnot");
    if (!mount) return;

    const w = () => mount.clientWidth || window.innerWidth;
    const h = () => mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w() / h(), 0.1, 100);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w(), h());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // a dense torus knot, drawn as its vertices
    const knot = new THREE.TorusKnotGeometry(3.2, 0.95, 380, 28);
    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute("position", knot.attributes.position);
    const knotPts = new THREE.Points(ptsGeo, new THREE.PointsMaterial({
      color: 0x9fd8ff, size: 0.022, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(knotPts);

    // a halo of cantaloupe dust
    const starCount = 600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 8 + Math.random() * 6;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos[i * 3]     = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      starPos[i * 3 + 2] = r * Math.cos(p);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xfc734d, size: 0.04, transparent: true, opacity: 0.6, depthWrite: false,
    }));
    scene.add(stars);

    // mouse parallax
    const target = { x: 0, y: 0 }, current = { x: 0, y: 0 };
    window.addEventListener("pointermove", (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    new ResizeObserver(() => {
      camera.aspect = w() / h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
      if (reduce) renderer.render(scene, camera);
    }).observe(mount);

    if (reduce) { knotPts.rotation.set(0.2, 0.6, 0); renderer.render(scene, camera); return; }

    let inView = true;
    new IntersectionObserver((es) => es.forEach((e) => { inView = e.isIntersecting; })).observe(mount);
    (function loop() {
      if (inView && !document.hidden) {
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
    })();
  })();

  /* ─────────────────────────────────────────────────────────
     THE TOWER · a dotted building that assembles as you scroll.
     Dots fly in electric blue and settle as pale ice; the spire
     and its tip are cantaloupe. One build runs across both
     tower sections.
     ───────────────────────────────────────────────────────── */
  function initConstructionBg(mountId) {
    const wrapper = document.getElementById(mountId);
    if (!wrapper) return;
    const mount = wrapper.querySelector(".tower-sticky") || wrapper;

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
    const grid = new THREE.GridHelper(500, 50, 0x0b3550, 0x0b3550);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.position.y = -0.5;
    scene.add(grid);

    let raw = 0, smooth = 0;
    function updateProgress() {
      // Global build progress · spans from the top of #safety to the bottom of
      // #bench. Both sticky towers share it, so the build is one continuous
      // motion across the two sections that carry it.
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
    const mix = (a, b, t) => a + (b - a) * t;

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
          if (p.kind === "edge") {          // electric blue in flight, pale steel in place
            r = mix(0.008, 0.56, e); g = mix(0.59, 0.77, e); b = mix(0.87, 0.9, e);
            scale = 0.75 + e * 0.45;
          } else if (p.kind === "window") {
            r = mix(0.008, 0.05, e); g = mix(0.45, 0.33, e); b = mix(0.7, 0.52, e);
            scale = 0.45 + e * 0.3;
          } else if (p.kind === "spire") {  // cantaloupe
            r = 0.988; g = 0.451; b = 0.302;
            scale = 0.75 + e * 0.45;
          } else {
            r = 1.0; g = 0.62; b = 0.5;
            scale = 1.6 + e * 0.6 + Math.sin(t * 3) * 0.2;
          }

          tmpP.set(x, y, z); tmpQ.set(0,0,0,1); tmpS.set(scale, scale, scale);
          tmpM.compose(tmpP, tmpQ, tmpS);
          mesh.setMatrixAt(i, tmpM);
          tmpC.setRGB(r, g, b, THREE.SRGBColorSpace);
          mesh.setColorAt(i, tmpC);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        renderer.render(scene, camera);
      }
      requestAnimationFrame(loop);
    })();
  }
  initConstructionBg("tower-safety");
  initConstructionBg("tower-bench");
})();
