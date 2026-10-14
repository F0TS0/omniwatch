export type ObservedSignal = { label: string; value: string; implication: string };

/** The deliberately small set shown in the dossier. The rest stay uncollected in the UI. */
export const featuredSignalLabels = [
  "LOCAL TIME ZONE",
  "INTERFACE LANGUAGES",
  "USER AGENT",
  "SCREEN / COLOUR DEPTH",
  "PROCESSOR HINT",
  "NETWORK HINT",
] as const;

export function featuredBrowserSignals(signals: ObservedSignal[]): ObservedSignal[] {
  return featuredSignalLabels.flatMap((label) => signals.filter((signal) => signal.label === label));
}

/** `-getTimezoneOffset()` is minutes west of UTC; flip sign and scale to hours. */
export function formatUtcOffset(timezoneOffsetMinutes: number): string {
  return `${-timezoneOffsetMinutes / 60} hours`;
}

export function formatScreenSize(width: number, height: number, colorDepth: number): string {
  return `${width} × ${height} / ${colorDepth}-bit`;
}

/**
 * Reads only the six browser-visible signals the dossier can reveal: no
 * fingerprinting canvas/WebGL reads, storage, or network. Everything here is
 * exposed by ordinary Navigator/Screen/Intl properties.
 */
export function readBrowserSignals(): ObservedSignal[] {
  const details = navigator as Navigator & {
    connection?: { effectiveType?: string };
  };

  return [
    { label: "LOCAL TIME ZONE", value: Intl.DateTimeFormat().resolvedOptions().timeZone || "unavailable", implication: "narrows your region" },
    { label: "INTERFACE LANGUAGES", value: navigator.languages?.join(", ") || navigator.language || "unavailable", implication: "suggests a linguistic profile" },
    { label: "USER AGENT", value: navigator.userAgent, implication: "declares browser and operating-system traits" },
    { label: "SCREEN / COLOUR DEPTH", value: formatScreenSize(screen.width, screen.height, screen.colorDepth), implication: "adds display hardware detail" },
    { label: "PROCESSOR HINT", value: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} logical cores` : "unavailable", implication: "suggests device capability" },
    { label: "NETWORK HINT", value: details.connection?.effectiveType || "not exposed", implication: "reveals a coarse connection category" },
  ];
}
