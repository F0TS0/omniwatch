"use client";

import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { use, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildGeometry, particles } from "@/lib/particles";
import { reducedMotion } from "@/lib/motion";

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAssemble;
uniform float uDecay;
uniform float uNoiseAmp;
uniform float uBreath;
uniform float uSize;           // GSAP drives this one
uniform float uViewportScale;  // and this one follows the viewport
uniform float uPixelRatio;
uniform float uPointerActive;
uniform vec3  uPointer;
uniform vec2  uLook;
uniform vec4  uOcular;        // x0, y0, x1, y1 in world space
uniform vec2  uOcularOffset;

attribute vec3  aTarget;
attribute float aSeed;
attribute float aLum;
attribute float aSurface;

varying float vSeed;
varying float vLum;
varying float vSurface;
varying float vLight;

float easeOutCubic(float t) {
  float u = 1.0 - t;
  return 1.0 - u * u * u;
}

// Curl-style in feel, not in maths: three sine pairs read as organic drift for
// a fraction of the cost of real divergence-free noise, and at 60k vertices
// that difference is the frame budget.
vec3 drift(vec3 p, float t) {
  return vec3(
    sin(p.y * 1.7 + t)       + sin(p.z * 2.3 - t * 0.7),
    sin(p.z * 1.9 + t * 1.1) + sin(p.x * 2.1 + t * 0.6),
    sin(p.x * 1.5 + t * 0.9) + sin(p.y * 2.7 - t * 0.8)
  );
}

void main() {
  float seed    = abs(aSeed);
  float drifter = step(aSeed, 0.0);   // negative seed: never assembles
  vSeed = seed;
  vLum  = aLum;
  vSurface = aSurface;

  // Degradation is positional: the target walks onto a coarse raster grid.
  // Never an opacity fade.
  float cell = 0.075;
  vec3 raster = floor(aTarget / cell) * cell + cell * 0.5;
  vec3 target = mix(aTarget, raster, uDecay);

  // The eye and brow region carries its own offset, retargeted on a hard cut.
  float inOcular =
      step(uOcular.x, aTarget.x) * step(aTarget.x, uOcular.z) *
      step(uOcular.y, aTarget.y) * step(aTarget.y, uOcular.w);
  target.xy += uOcularOffset * inOcular;

  // Turn the assembled particle plane in both axes, so every pointer position
  // has a matching pose without requiring nine separate portrait targets.
  float yaw = uLook.x * 0.72;
  float pitch = -uLook.y * 0.48;
  float x = target.x;
  target.x = x * cos(yaw) + target.z * sin(yaw);
  target.z = -x * sin(yaw) + target.z * cos(yaw);
  float y = target.y;
  target.y = y * cos(pitch) - target.z * sin(pitch);
  target.z = y * sin(pitch) + target.z * cos(pitch);

  vec3 normal = normalize(vec3(target.x / 0.5, (target.y + 0.02) / 0.72, target.z / 0.3));
  vec3 light = normalize(vec3(-0.65, 0.35, 0.8));
  vLight = 0.24 + 0.76 * max(0.0, dot(normal, light));

  // Breathing loosens and re-tightens the whole face on a slow sine.
  float assemble = uAssemble * uBreath;

  // Staggered arrival: the seed delays each particle rather than easing it.
  float t = easeOutCubic(clamp(assemble * 1.6 - seed * 0.6, 0.0, 1.0));
  t *= 1.0 - drifter;

  vec3 pos = mix(position, target, t);

  // The assembled field keeps a visible, low-speed hover rather than freezing.
  float amp = uNoiseAmp * (1.0 - uAssemble * 0.60);
  pos += drift(pos * 0.9 + seed * 10.0, uTime * 0.40) * amp;

  // Turning and repulsion give the pointer a physical presence in the field.
  vec3 away = pos - uPointer;
  float push = (1.0 - smoothstep(0.0, 0.25, length(away))) * uPointerActive;
  pos += normalize(away + vec3(1e-5)) * push * 0.14;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  // Clamped: mid-assembly the scatter sphere puts particles right in front of
  // the camera, and distance attenuation turns those into blobs the size of an
  // eye socket.
  float size = uSize * uViewportScale * (0.55 + 0.45 * aLum) * uPixelRatio / -mv.z;
  gl_PointSize = min(size, 4.0 * uPixelRatio);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3  uColor;
uniform float uOpacity;

varying float vSeed;
varying float vLum;
varying float vSurface;
varying float vLight;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;      // round points, no texture needed
  // Vary by seed so the field is never uniform.
  float shade = 0.35 + 0.65 * vLight;
  float skull = step(0.5, vSurface) * (1.0 - step(1.5, vSurface));
  float ear = step(1.5, vSurface);
  float surface = mix(1.0, 0.5, skull);
  surface = mix(surface, 0.7, ear);
  float a = uOpacity * (0.30 + 0.70 * vLum) * (0.70 + 0.30 * vSeed) * shade * surface;
  gl_FragColor = vec4(uColor * shade, a);
}
`;

/** Reads a design token rather than hardcoding the value in two places. */
function token(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

const terminalGlances = [
  new THREE.Vector2(-0.5, 0.24),
  new THREE.Vector2(0.46, -0.18),
  new THREE.Vector2(0.28, 0.26),
];

export function ParticleField({ active }: { active: boolean }) {
  const data = use(particles());
  const geometry = useMemo(() => buildGeometry(data), [data]);

  // Initial values only. R3F copies them into the material, which is mutated
  // directly below from useFrame and GSAP.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      // Reduced motion skips the assembly entirely: the face is simply there.
      uAssemble: { value: reducedMotion ? 1 : 0 },
      uDecay: { value: 0 },
      uNoiseAmp: { value: reducedMotion ? 0 : 0.06 },
      uBreath: { value: 1 },
      uSize: { value: 10 },
      uViewportScale: { value: 1 },
      uOpacity: { value: 0.7 },
      uPixelRatio: { value: 1 },
      uPointerActive: { value: 0 },
      uPointer: { value: new THREE.Vector3(0, 0, 999) },
      uLook: { value: new THREE.Vector2() },
      uOcular: { value: data.ocular },
      uOcularOffset: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Color(token("--bone", "#e8e3d8")) },
    }),
    [data.ocular],
  );
  const material = useRef<THREE.ShaderMaterial>(null);

  // Placeholder assembly, so the stagger can be judged before the HUD sits on
  // top of it. R3F clones `uniforms` when applying the material prop, so all
  // runtime writes must target the rendered material's map.
  useEffect(() => {
    const rendered = material.current;
    if (reducedMotion || !rendered) return;
    const tween = gsap.to(rendered.uniforms.uAssemble, {
      value: 1,
      duration: 3.5,
      delay: 0.6,
      ease: "none",
    });
    return () => {
      tween.kill();
    };
  }, [uniforms]);

  const lastPointer = useRef({ x: 0, y: 0, at: -Infinity });
  const look = useRef(new THREE.Vector2());
  const nextOcular = useRef(0);
  const world = useRef(new THREE.Vector3());

  useFrame(({ clock, camera, pointer, size }, delta) => {
    const rendered = material.current;
    if (!rendered) return;
    const uniforms = rendered.uniforms;
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    // Point size is in device pixels, so a short viewport needs smaller points
    // or the face turns into a solid mass. Kept off uSize so a resize mid-scene
    // cannot stamp on whatever GSAP is tweening.
    uniforms.uViewportScale.value = Math.min(1, size.height / 900);

    if (reducedMotion) return;

    // During a state change, the portrait ignores the visitor and moves
    // between fixed positions, reading as a deliberate system response.
    const glance = terminalGlances[Math.floor(t / 0.9) % terminalGlances.length];
    const lookTarget = active ? glance : pointer;
    look.current.x = THREE.MathUtils.damp(look.current.x, lookTarget.x, active ? 3.4 : 5, delta);
    look.current.y = THREE.MathUtils.damp(look.current.y, lookTarget.y, active ? 3.4 : 5, delta);
    uniforms.uLook.value.copy(look.current);

    // Breathing: 1.0 to 0.985 on a 6s sine. Barely perceptible, but registered.
    uniforms.uBreath.value = 0.9925 + 0.0075 * Math.sin((t * Math.PI * 2) / 6);

    // Ocular drift: a hard cut to a new offset every 2 to 5 seconds. No easing,
    // because a system changing what it looks at does not ease.
    if (active) {
      uniforms.uOcularOffset.value.set(-glance.x * 0.022, -glance.y * 0.014);
    } else if (t > nextOcular.current) {
      uniforms.uOcularOffset.value.set(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.012,
      );
      nextOcular.current = t + 2 + Math.random() * 3;
    }

    // Pointer: project the cursor onto the z=0 plane the face sits on.
    const p = lastPointer.current;
    if (Math.abs(pointer.x - p.x) > 1e-4 || Math.abs(pointer.y - p.y) > 1e-4) {
      p.x = pointer.x;
      p.y = pointer.y;
      p.at = t;
    }
    world.current.set(pointer.x, pointer.y, 0.5).unproject(camera);
    world.current.sub(camera.position).normalize();
    const dist = -camera.position.z / world.current.z;
    uniforms.uPointer.value
      .copy(camera.position)
      .addScaledVector(world.current, dist);
    // Strength decays over 300ms after the pointer stops.
    uniforms.uPointerActive.value = Math.max(0, 1 - (t - p.at) / 0.3);
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        // The head surfaces must depth-occlude. Without this, rear dots
        // blend through the face and the field reads as a flat projection.
        depthWrite
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
