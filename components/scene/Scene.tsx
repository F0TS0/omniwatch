"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { ParticleField } from "./ParticleField";

export function Scene({ active }: { active: boolean }) {
  return (
    <Canvas
      // The field is the only thing drawn. No post-processing passes.
      camera={{ fov: 35, position: [0, 0, 2.7] }}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: true, preserveDrawingBuffer: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Suspense fallback={null}>
        <ParticleField active={active} />
      </Suspense>
    </Canvas>
  );
}
