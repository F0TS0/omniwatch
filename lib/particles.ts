import * as THREE from "three";
import { reducedMotion } from "./motion";

type Manifest = {
  aspect: number;
  stride: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  regions: { ocular: { x0: number; y0: number; x1: number; y1: number } };
  variants: { count: number; file: string; drifters: number }[];
};

export type ParticleData = {
  count: number;
  stride: number;
  /** Interleaved x, y, z, lum, seed, surface straight from the .bin. */
  raw: Float32Array;
  /** x0, y0, x1, y1 of the eye and brow region, in world space. */
  ocular: THREE.Vector4;
  bounds: Manifest["bounds"];
};

/** Radius of the sphere every particle starts scattered on. */
const SCATTER_RADIUS = 6;

/**
 * Density from the device's actual capabilities, never from a user agent
 * string. A small viewport or a coarse pointer on a dense display is the
 * signal; the name of the browser is not.
 */
export function chooseDensity(): number {
  if (reducedMotion) return 15000;
  const small = window.matchMedia("(max-width: 900px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const dense = window.devicePixelRatio > 2;
  return small || (coarse && dense) ? 15000 : 60000;
}

async function load(name: string): Promise<ParticleData> {
  const manifest: Manifest = await fetch(`/portraits/${name}.json`).then((r) =>
    r.json(),
  );
  const wanted = chooseDensity();
  const variant =
    manifest.variants.find((v) => v.count === wanted) ?? manifest.variants[0];

  const buffer = await fetch(`/portraits/${variant.file}`).then((r) =>
    r.arrayBuffer(),
  );
  const { x0, y0, x1, y1 } = manifest.regions.ocular;
  return {
    count: variant.count,
    stride: manifest.stride,
    raw: new Float32Array(buffer),
    ocular: new THREE.Vector4(x0, y0, x1, y1),
    bounds: manifest.bounds,
  };
}

/**
 * Built per component instance, never cached. A BufferGeometry owns GPU
 * resources and R3F disposes it on unmount: a module-level cache would hand
 * the second mount a geometry whose buffers are already gone, and the field
 * would render nothing without erroring.
 */
export function buildGeometry(data: ParticleData): THREE.BufferGeometry {
  // One interleaved buffer, three attribute views over it. Splitting into
  // separate arrays would mean copying 1.4MB for no gain.
  const interleaved = new THREE.InterleavedBuffer(data.raw, data.stride);

  // Every particle starts somewhere on a large sphere. This is the `position`
  // attribute proper, so the vertex shader mixes from it toward aTarget.
  const scatter = new Float32Array(data.count * 3);
  for (let i = 0; i < data.count; i++) {
    // Uniform on the sphere: z uniform in [-1,1], angle uniform in [0,2pi).
    const z = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    scatter[i * 3] = Math.cos(a) * r * SCATTER_RADIUS;
    scatter[i * 3 + 1] = Math.sin(a) * r * SCATTER_RADIUS;
    scatter[i * 3 + 2] = z * SCATTER_RADIUS;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(scatter, 3));
  geometry.setAttribute(
    "aTarget",
    new THREE.InterleavedBufferAttribute(interleaved, 3, 0),
  );
  geometry.setAttribute(
    "aLum",
    new THREE.InterleavedBufferAttribute(interleaved, 1, 3),
  );
  // aDrifter is not its own attribute: the sign of aSeed carries the flag, so
  // the shader reads both out of one float. See scripts/generate-particles.mts.
  geometry.setAttribute(
    "aSeed",
    new THREE.InterleavedBufferAttribute(interleaved, 1, 4),
  );
  geometry.setAttribute(
    "aSurface",
    new THREE.InterleavedBufferAttribute(interleaved, 1, 5),
  );

  // Positions are displaced in the vertex shader, so a bounding sphere fitted
  // to the source data would cull the field at the wrong moment.
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(),
    SCATTER_RADIUS * 2,
  );
  return geometry;
}

// Cached so React's double-invoked effects and Suspense retries do not fetch
// 1.2MB twice.
const cache = new Map<string, Promise<ParticleData>>();

export function particles(name = "eve"): Promise<ParticleData> {
  let p = cache.get(name);
  if (!p) {
    p = load(name);
    cache.set(name, p);
  }
  return p;
}
