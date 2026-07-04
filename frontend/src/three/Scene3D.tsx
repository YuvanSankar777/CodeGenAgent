import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * WebGL background: a drifting particle field + a glowing wireframe
 * icosahedron cluster that reacts to mouse parallax and scroll.
 * Vanilla three.js (no react-three-fiber) for a small, predictable bundle.
 * Fixed full-viewport canvas rendered behind all content.
 */
export default function Scene3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Respect reduced-motion preferences.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1120, 0.05);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // --- Particle field --------------------------------------------------
    const COUNT = 1400;
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      speeds[i] = 0.002 + Math.random() * 0.006;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x8b5cf6,
      size: 0.045,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // --- Wireframe cluster ----------------------------------------------
    const group = new THREE.Group();
    const makeShape = (
      radius: number,
      color: number,
      detail: number,
      pos: [number, number, number]
    ) => {
      const geo = new THREE.IcosahedronGeometry(radius, detail);
      const mat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...pos);
      return mesh;
    };
    const core = makeShape(2.3, 0x7c3aed, 1, [0, 0, 0]);
    const orbit1 = makeShape(0.9, 0x22d3ee, 0, [3.4, 1.4, -1]);
    const orbit2 = makeShape(0.6, 0x22c55e, 0, [-3.6, -1.6, -1.5]);
    group.add(core, orbit1, orbit2);
    scene.add(group);

    // Glowing point core
    const glowGeo = new THREE.IcosahedronGeometry(0.5, 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.9,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    core.add(glow);

    // --- Interaction state ----------------------------------------------
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollN = 0;

    const onMouse = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scrollN = max > 0 ? window.scrollY / max : 0;
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();

    // --- Animation loop --------------------------------------------------
    let raf = 0;
    let t = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      t += dt;

      // ease mouse
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      if (!reduced) {
        group.rotation.y = t * 0.12 + scrollN * Math.PI * 1.2;
        group.rotation.x = mouse.y * 0.3 + scrollN * 0.6;
        core.rotation.z = t * 0.1;
        orbit1.position.x = 3.4 + Math.sin(t * 0.6) * 0.4;
        orbit1.position.y = 1.4 + Math.cos(t * 0.5) * 0.4;
        orbit2.position.y = -1.6 + Math.sin(t * 0.7) * 0.4;
        const s = 1 + Math.sin(t * 1.5) * 0.08;
        glow.scale.setScalar(s);

        // particle drift
        const arr = pGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < COUNT; i++) {
          arr[i * 3 + 1] += speeds[i];
          if (arr[i * 3 + 1] > 13) arr[i * 3 + 1] = -13;
        }
        pGeo.attributes.position.needsUpdate = true;
        points.rotation.y = t * 0.02;
      }

      // camera parallax + gentle scroll dolly
      camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.05;
      camera.position.y += (-mouse.y * 0.8 - camera.position.y) * 0.05;
      camera.position.z = 9 - scrollN * 2.5;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // --- Cleanup ---------------------------------------------------------
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      pGeo.dispose();
      pMat.dispose();
      [core, orbit1, orbit2, glow].forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="scene3d" aria-hidden="true" />;
}
