"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { createLinkGeometry, createPhoneGeometry, createScreenGeometry, ringPoses, stackPoses } from "./chain";

export type Quality = "high" | "low";

/** Scroll progress 0 → 1 (ring → stack) and pointer position (-1…1), written by the page. */
export type SceneInput = {
  progress: number;
  pointer: { x: number; y: number };
};

const COUNT = 8;
// Bone-white glazed ceramic, with the brand's deep green and ink as accents.
const GLAZES = ["#efe8db", "#1e5b47", "#efe8db", "#efe8db", "#1b1a17", "#efe8db", "#1e5b47", "#efe8db"];
const RING_TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.78, 0.3, 0.12));
const Z_AXIS = new THREE.Vector3(0, 0, 1);

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = THREE.MathUtils.lerp;

// Scratch objects reused every frame (no allocations in the render loop).
const scratch = {
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  ringFrame: new THREE.Quaternion(),
  spin: new THREE.Quaternion(),
};

// Where the whole piece sits (scene units) at the start and end of the scroll:
// beside the copy on wide screens; above it, then below it, on phones.
const FRAMING = {
  wide: { from: { x: 2.15, y: 0.1, scale: 0.84 }, to: { x: 2.3, y: 0, scale: 0.35 } },
  compact: { from: { x: 0, y: 1.45, scale: 0.46 }, to: { x: 0, y: -1.05, scale: 0.27 } },
};
// The phone body the links settle into (in the stack's own units).
const PHONE = { width: 5.6, height: 11.6, depth: 0.36, bezel: 0.3 };

function Links({ input, quality, still }: { input: RefObject<SceneInput>; quality: Quality; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const spin = useRef(0);
  const { size } = useThree();
  const compact = size.width < 768;

  const geometry = useMemo(() => createLinkGeometry(quality), [quality]);
  const materials = useMemo(
    () =>
      GLAZES.map(
        (color) =>
          new THREE.MeshPhysicalMaterial({
            color,
            roughness: 0.42,
            clearcoat: 0.8,
            clearcoatRoughness: 0.28,
          }),
      ),
    [],
  );
  const ring = useMemo(() => ringPoses(COUNT, 0), []);
  const stack = useMemo(() => stackPoses(COUNT, 0.16), []);
  const phone = useRef<THREE.Group>(null);
  const phoneBody = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.Material>>(null);
  const phoneScreen = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.Material>>(null);
  const phoneGeometry = useMemo(
    () => ({
      body: createPhoneGeometry(PHONE.width, PHONE.height, PHONE.depth, 0.85),
      screen: createScreenGeometry(PHONE.width - PHONE.bezel * 2, PHONE.height - PHONE.bezel * 2, 0.6),
    }),
    [],
  );
  const phoneMaterials = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({ color: "#1b1a17", roughness: 0.55, clearcoat: 0.15, transparent: true }),
      // A display emits its own light, so the screen ignores the scene lighting.
      screen: new THREE.MeshBasicMaterial({ color: "#f6f2ea", transparent: true, toneMapped: false }),
    }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      phoneMaterials.body.dispose();
      phoneMaterials.screen.dispose();
      phoneGeometry.body.dispose();
      phoneGeometry.screen.dispose();
    },
    [geometry, materials, phoneMaterials, phoneGeometry],
  );

  useFrame((_, delta) => {
    const { progress, pointer } = input.current;
    // Cap the step so a stalled tab doesn't jump, but let slow devices still settle.
    const dt = Math.min(delta, 0.1);
    // The hub turns slowly while idle and settles as it unlinks.
    if (!still) spin.current += dt * 0.12 * (1 - smoothstep(clamp01(progress * 1.6)));
    // The ring's frame: spun about its own axis, then tilted towards the camera.
    scratch.spin.setFromAxisAngle(Z_AXIS, spin.current);
    scratch.ringFrame.copy(RING_TILT).multiply(scratch.spin);

    meshes.current.forEach((mesh, i) => {
      if (!mesh) return;
      // Each link leaves the ring a little after the previous one.
      const local = smoothstep(clamp01((progress - i * 0.045) / 0.62));
      scratch.position.copy(ring[i].position).applyQuaternion(scratch.ringFrame).lerp(stack[i].position, local);
      // Arc outwards mid-flight so links don't pass through each other.
      scratch.position.z += Math.sin(local * Math.PI) * (1.2 + (i % 3) * 0.35);
      scratch.quaternion.copy(scratch.ringFrame).multiply(ring[i].quaternion).slerp(stack[i].quaternion, local);
      mesh.position.copy(scratch.position);
      mesh.quaternion.copy(scratch.quaternion);
      // Settled links stretch into button-shaped outlines.
      mesh.scale.x = 1 + 0.75 * local;
    });

    // The phone body rises in behind the stack in the last part of the scroll.
    const reveal = smoothstep(clamp01((progress - 0.5) / 0.4));
    if (phoneBody.current) phoneBody.current.material.opacity = reveal;
    if (phoneScreen.current) phoneScreen.current.material.opacity = reveal;
    if (phone.current) {
      phone.current.visible = reveal > 0.001;
      phone.current.position.z = -0.7 - (1 - reveal) * 2.5;
    }

    const g = group.current;
    if (!g) return;
    const frame = compact ? FRAMING.compact : FRAMING.wide;
    // Shrink ahead of the links so they never overshoot the frame mid-flight.
    const settle = smoothstep(clamp01(progress / 0.7));
    const scale = lerp(frame.from.scale, frame.to.scale, settle);
    const x = lerp(frame.from.x, frame.to.x, settle);
    const y = lerp(frame.from.y, frame.to.y, settle);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, scale, 6, dt));
    g.position.x = THREE.MathUtils.damp(g.position.x, x, 6, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, y, 6, dt);
    // Lean towards the pointer (gently; never a full turn).
    const tiltX = still ? 0 : -pointer.y * 0.22;
    const tiltY = still ? 0 : pointer.x * 0.32;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tiltX, 4, dt);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, tiltY, 4, dt);
  });

  return (
    <group ref={group}>
      {materials.map((material, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          geometry={geometry}
          material={material}
          castShadow={quality === "high"}
        />
      ))}
      <group ref={phone} visible={false}>
        <mesh ref={phoneBody} geometry={phoneGeometry.body} material={phoneMaterials.body} />
        <mesh
          ref={phoneScreen}
          geometry={phoneGeometry.screen}
          material={phoneMaterials.screen}
          position-z={PHONE.depth / 2 + 0.005}
        />
      </group>
    </group>
  );
}

/** Soft studio light rendered from shapes in code; no environment files are downloaded. */
function Studio({ quality }: { quality: Quality }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} color="#fff6ea" />
      <directionalLight position={[-5, 2, -3]} intensity={0.45} color="#dfe9e3" />
      <Environment resolution={quality === "high" ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 4]} scale={[10, 3, 1]} color="#fffaf2" />
        <Lightformer form="rect" intensity={1.1} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} color="#f2efe7" />
        <Lightformer form="ring" intensity={1.4} position={[5, 2, -2]} scale={3} color="#e6f0ea" />
      </Environment>
    </>
  );
}

export default function InterlinkedScene({
  input,
  active,
  still,
  onQualityChange,
  quality,
}: {
  input: RefObject<SceneInput>;
  /** False while the stage is off-screen or the tab is hidden: rendering stops. */
  active: boolean;
  /** Reduced motion: no spin or pointer tilt. */
  still: boolean;
  quality: Quality;
  onQualityChange: (q: Quality) => void;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
      camera={{ position: [0, 0, 9], fov: 34, near: 0.1, far: 50 }}
      gl={{ antialias: quality === "high", alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      {/* Drop to the light preset if the device can't hold a smooth frame rate. */}
      <PerformanceMonitor onDecline={() => onQualityChange("low")} />
      <Studio quality={quality} />
      <Links input={input} quality={quality} still={still} />
      <ContactShadows
        position={[0, -3.1, 0]}
        opacity={0.38}
        scale={14}
        blur={2.6}
        far={6}
        resolution={quality === "high" ? 512 : 256}
        frames={still ? 1 : Infinity}
        color="#3d3a34"
      />
    </Canvas>
  );
}
