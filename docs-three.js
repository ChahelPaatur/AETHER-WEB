// ===== Decorative 3D scene for the doc hero (#three-doc) =====
// Mirrors the index hero: a slowly rotating dotted torus knot + accent stars,
// with cursor parallax. Degrades silently if WebGL/THREE is unavailable.
(function () {
  "use strict";
  if (!window.THREE) { console.warn("THREE.js unavailable — doc hero stays static."); return; }

  const mount = document.getElementById("three-doc");
  if (!mount) return;

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const w = () => mount.clientWidth || window.innerWidth;
  const h = () => mount.clientHeight || mount.offsetHeight || 320;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, w() / h(), 0.1, 100);
  camera.position.set(0, 0, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w(), h());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";

  const knot = new THREE.TorusKnotGeometry(3.0, 0.85, 320, 26);
  const ptsGeo = new THREE.BufferGeometry();
  ptsGeo.setAttribute("position", knot.attributes.position);
  const knotPts = new THREE.Points(ptsGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.02, transparent: true, opacity: 0.45,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(knotPts);

  const starCount = 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 7 + Math.random() * 6;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
    starPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    starPos[i * 3 + 2] = r * Math.cos(p);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xff4d1c, size: 0.045, transparent: true, opacity: 0.6, depthWrite: false
  }));
  scene.add(stars);

  const target = { x: 0, y: 0 }, current = { x: 0, y: 0 };
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
      if (!reduce) {
        knotPts.rotation.y += 0.0022;
        stars.rotation.y -= 0.0005;
        stars.rotation.x += 0.00025;
      }
      knotPts.rotation.x = current.y * 0.35;
      knotPts.rotation.z = -current.x * 0.35;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  }
  loop();
})();
