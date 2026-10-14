"use client";

import dynamic from "next/dynamic";

const FaceScene = dynamic(
  () => import("@/components/scene/Scene").then((module) => module.Scene),
  { ssr: false },
);

export type FaceState = "idle" | "processing" | "threshold" | "authorised";

export default function OmniWatchFace({
  state = "idle",
  size = "landing",
}: {
  state?: FaceState;
  size?: "landing" | "compact";
}) {
  return (
    <div
      className={`omniwatch-face omniwatch-face--${size}`}
      data-state={state}
      role="img"
      aria-label="OmniWatch system visual"
    >
      <FaceScene active={state !== "idle"} />
    </div>
  );
}
