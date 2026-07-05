import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * "Code Foundry" — a lit, shaded 3D scene (not a wireframe pattern):
 * a glowing lime forge core with a rotating energy shell, orbiting code
 * blocks being "forged", and forge rings — the metaphor for turning raw
 * words into code. Warm three-point lighting on a transparent canvas so the
 * page's bone background shows through. Confined to its parent (the hero).
 */
export default function Scene3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const w = () => mount.clientWidth || window.innerWidth;
    const h = () => mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, w() / h(), 0.1, 100);
    camera.position.set(0, 1.4, 8.5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w(), h());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // --- Lighting (warm three-point) ------------------------------------
    scene.add(new THREE.AmbientLight(0xfff4e0, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(4, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff7a3d, 1.1); // coral rim
    rim.position.set(-6, 2, -4);
    scene.add(rim);
    const coreLight = new THREE.PointLight(0xc6f03b, 6, 16, 2); // lime glow
    coreLight.position.set(0, 0, 0);
    scene.add(coreLight);

    const group = new THREE.Group();
    scene.add(group);

    // --- Forge core ------------------------------------------------------
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.35, 1),
      new THREE.MeshStandardMaterial({
        color: 0x1a1712,
        emissive: 0xc6f03b,
        emissiveIntensity: 0.5,
        metalness: 0.6,
        roughness: 0.25,
        flatShading: true,
      })
    );
    group.add(core);

    // energy shell (thin lime wireframe that counter-rotates)
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.85, 1),
      new THREE.MeshBasicMaterial({
        color: 0xc6f03b,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      })
    );
    group.add(shell);

    // --- Forge rings -----------------------------------------------------
    const rings: THREE.Mesh[] = [];
    const ringSpecs: [number, number][] = [
      [2.6, 0x0e4d45],
      [3.1, 0xff5b2e],
    ];
    ringSpecs.forEach(([r, color], i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.035, 12, 90),
        new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.5 })
      );
      ring.rotation.x = Math.PI / 2 + i * 0.5;
      group.add(ring);
      rings.push(ring);
    });

    // --- Orbiting code blocks (being "forged") --------------------------
    const blocks: { mesh: THREE.Mesh; a: number; r: number; y: number; s: number }[] = [];
    const blockColors = [0x1a1712, 0xff5b2e, 0xc6f03b, 0x0e4d45];
    const COUNT = 16;
    for (let i = 0; i < COUNT; i++) {
      const size = 0.22 + Math.random() * 0.3;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size * 0.5, size),
        new THREE.MeshStandardMaterial({
          color: blockColors[i % blockColors.length],
          metalness: 0.3,
          roughness: 0.45,
          emissive: i % 3 === 0 ? 0xc6f03b : 0x000000,
          emissiveIntensity: i % 3 === 0 ? 0.25 : 0,
        })
      );
      const a = (i / COUNT) * Math.PI * 2;
      const r = 2.3 + Math.random() * 1.4;
      const y = (Math.random() - 0.5) * 2.4;
      mesh.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      group.add(mesh);
      blocks.push({ mesh, a, r, y, s: 0.4 + Math.random() * 0.7 });
    }

    // --- Interaction -----------------------------------------------------
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollN = 0;
    const onMouse = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      const max = window.innerHeight;
      scrollN = Math.min(1, window.scrollY / max);
    };
    const onResize = () => {
      camera.aspect = w() / h();
      camera.updateProjectionMatrix();
      renderer.setSize(w(), h());
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // --- Loop ------------------------------------------------------------
    let raf = 0;
    const clock = new THREE.Clock();
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      t += dt;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      if (!reduced) {
        core.rotation.y = t * 0.35;
        core.rotation.x = t * 0.15;
        (core.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.42 + Math.sin(t * 2) * 0.16;
        coreLight.intensity = 5 + Math.sin(t * 2) * 2;
        shell.rotation.y = -t * 0.22;
        shell.rotation.z = t * 0.12;
        rings[0].rotation.z = t * 0.4;
        rings[1].rotation.z = -t * 0.3;
        blocks.forEach((b) => {
          const ang = b.a + t * b.s * 0.5;
          b.mesh.position.set(Math.cos(ang) * b.r, b.y + Math.sin(t * b.s + b.a) * 0.35, Math.sin(ang) * b.r);
          b.mesh.rotation.x += dt * b.s;
          b.mesh.rotation.y += dt * b.s * 0.7;
        });
        group.rotation.y = mouse.x * 0.35 + scrollN * 0.8;
        group.position.y = -scrollN * 1.2;
      }

      camera.position.x += (mouse.x * 1.1 - camera.position.x) * 0.05;
      camera.position.y += (1.4 - mouse.y * 0.8 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mat = m.material as THREE.Material | THREE.Material[];
          Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat.dispose();
        }
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="scene3d" aria-hidden="true" />;
}
