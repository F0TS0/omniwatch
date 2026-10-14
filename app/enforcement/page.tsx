"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { historicalCases } from "@/data/cases";
import { readOperatorContext, writeOperatorContext, type OperatorContext } from "@/lib/operator-context";

const thresholds = [50, 60, 70, 80, 90];
const LUTHER_ID = "luther-1517";

export default function EnforcementPage() {
  const router = useRouter();
  const [context, setContext] = useState<OperatorContext | null>(null);
  const [threshold, setThreshold] = useState(70);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setContext(readOperatorContext()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function begin() {
    writeOperatorContext({
      dossierId: context?.dossierId ?? "OW-UNKNOWN",
      observedSignalCount: context?.observedSignalCount ?? 0,
      selectedBehaviourLabel: context?.selectedBehaviourLabel ?? "unspecified",
      trained: context?.trained ?? false,
      classificationIndex: context?.classificationIndex ?? 0,
      interventionThreshold: threshold,
    });
    router.push(`/case/${LUTHER_ID}`);
  }

  return (
    <main className="archive-page enforcement-page">
      <header className="case-topbar">
        <Link href="/" className="wordmark">OMNIWATCH</Link>
        <span>PERFECT ENFORCEMENT TEST</span>
      </header>

      <section className="archive-heading">
        <p className="eyebrow">OPERATOR CONFIGURATION</p>
        <h1>Configure the system you are about to test.</h1>
        <p>Observation is not enforcement. Give the system a policy, then watch it enforce that policy exactly as designed.</p>
      </section>

      <section className="operator-panel">
        <p className="eyebrow">CURRENT OPERATOR CONFIGURATION</p>
        <dl className="authorisation-list">
          <div><dt>SUBJECT DOSSIER</dt><dd>{context?.dossierId ?? "NOT CONFIGURED"}</dd></div>
          <div><dt>OBSERVED SIGNALS</dt><dd>{context ? context.observedSignalCount : "—"}</dd></div>
          <div><dt>CLASSIFICATION MODEL</dt><dd>{context?.trained ? "ACTIVE" : "NOT CONFIGURED"}</dd></div>
        </dl>
        {!context && (
          <p className="operator-note">No dossier found for this session. <Link href="/">Return to construct one</Link>, or continue with a default configuration.</p>
        )}
      </section>

      <section className="threshold-panel">
        <p className="eyebrow">INTERVENTION THRESHOLD</p>
        <h2>How tolerant should this system be?</h2>
        <div className="threshold-options" role="group" aria-label="Intervention threshold">
          {thresholds.map((t) => (
            <button
              key={t}
              type="button"
              className={`button ${t === threshold ? "button--solid" : ""}`}
              aria-pressed={t === threshold}
              onClick={() => setThreshold(t)}
            >
              {t}%
            </button>
          ))}
        </div>
        <p>A lower threshold authorises intervention earlier, on less certainty. A higher threshold waits for more evidence before acting.</p>
      </section>

      <section className="case-select-panel">
        <p className="eyebrow">HISTORICAL TEST CASE</p>
        <ul className="case-select-list">
          {historicalCases.map((c) => (
            <li key={c.id} className={c.curationStatus !== "READY" ? "is-unavailable" : ""}>
              <span>{c.title}</span>
              <span>{c.curationStatus === "READY" ? "READY" : "NOT YET AVAILABLE"}</span>
            </li>
          ))}
        </ul>
        <button className="button button--solid" onClick={begin}>BEGIN TEST</button>
      </section>
    </main>
  );
}
