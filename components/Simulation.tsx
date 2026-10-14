"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { HistoricalCase } from "@/data/cases";
import OmniWatchFace, { type FaceState } from "@/components/OmniWatchFace";
import {
  continueMonitoring,
  interveneNow,
  showOutcome,
  snapshotFor,
  startSimulation,
  withThreshold,
  type SimulationState,
} from "@/lib/simulation";
import { readOperatorContext, type OperatorContext } from "@/lib/operator-context";

function readable(value: string) {
  return value.replaceAll("_", " ");
}

function SignalTimeline({ caseData, revealedCount }: { caseData: HistoricalCase; revealedCount: number }) {
  const thresholdIndex = caseData.signals.findIndex((signal) => signal.confidenceAfter >= caseData.threshold);

  return (
    <section className="timeline-panel" aria-labelledby="timeline-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SIGNAL REGISTER</p>
          <h2 id="timeline-title">Observed sequence</h2>
        </div>
        <span>{revealedCount}/{caseData.signals.length} RELEASED</span>
      </div>
      <ol className="timeline-list">
        {caseData.signals.map((signal, index) => (
          <li className={index < revealedCount ? "timeline-entry" : "timeline-entry is-sealed"} key={signal.id}>
            {index === thresholdIndex && (
              <div className="threshold-marker">
                <span>PREVENTION THRESHOLD</span>
                <b>{caseData.threshold}%</b>
              </div>
            )}
            {index < revealedCount ? (
              <article className="signal-record">
                <header>
                  <span>{signal.id}</span>
                  <time>{signal.dateLabel}</time>
                </header>
                <div>
                  <p className="eyebrow">{signal.sourceLabel}</p>
                  <h3>{signal.description}</h3>
                  <p>{signal.interpretation}</p>
                </div>
                <footer>
                  <span>{signal.confidenceBefore}% → {signal.confidenceAfter}%</span>
                  <span>{signal.preventabilityState} PREVENTABILITY</span>
                </footer>
              </article>
            ) : (
              <div className="sealed-signal" aria-label="Future signal sealed">
                <span>SEALED</span>
                <span>FUTURE SIGNAL / {String(index + 1).padStart(2, "0")}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function PolicyPanel({ caseData, operatorContext }: { caseData: HistoricalCase; operatorContext: OperatorContext | null }) {
  return (
    <section className="policy-panel" aria-labelledby="policy-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SYSTEM POLICY</p>
          <h2 id="policy-title">Current operator configuration</h2>
        </div>
        <span>PERFECT ENFORCEMENT TEST</span>
      </div>
      <dl className="state-list">
        <div><dt>SUBJECT DOSSIER</dt><dd>{operatorContext?.dossierId ?? "NOT CONFIGURED"}</dd></div>
        <div><dt>OBSERVED SIGNALS</dt><dd>{operatorContext ? operatorContext.observedSignalCount : "—"}</dd></div>
        <div><dt>CLASSIFICATION MODEL</dt><dd>{operatorContext?.trained ? "ACTIVE" : "NOT CONFIGURED"}</dd></div>
        <div><dt>INTERVENTION THRESHOLD</dt><dd>{caseData.threshold}%</dd></div>
      </dl>
    </section>
  );
}

function StatePanel({ caseData, state }: { caseData: HistoricalCase; state: SimulationState }) {
  const snapshot = snapshotFor(caseData, state.revealedCount);
  const { signal } = snapshot;
  const faceState: FaceState =
    state.phase === "INTERVENTION" ? "authorised" : snapshot.thresholdCrossed ? "threshold" : "processing";

  return (
    <aside className="state-panel">
      <OmniWatchFace state={faceState} size="compact" />
      <section className="state-record" aria-labelledby="state-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LIVE CASE STATE</p>
            <h2 id="state-title">Procedural record</h2>
          </div>
        </div>
        <div className="confidence-display">
          <span>INTERVENTION CONFIDENCE</span>
          <strong>{snapshot.confidence}<small>%</small></strong>
          <div className="confidence-scale" aria-label={`${snapshot.confidence}% intervention confidence`}>
            <i style={{ width: `${snapshot.confidence}%` }} />
            <b style={{ left: `${caseData.threshold}%` }} />
          </div>
          <p>SIMULATED SYSTEM CONFIDENCE</p>
        </div>
        <dl className="state-list">
          <div><dt>PREPARATION</dt><dd>{signal.preparationState}</dd></div>
          <div><dt>PREVENTABILITY</dt><dd>{readable(signal.preventabilityState)}</dd></div>
          <div><dt>INTERVENTION WINDOW</dt><dd>{readable(signal.interventionWindow)}</dd></div>
          <div><dt>CASE STATUS</dt><dd className={snapshot.thresholdCrossed ? "is-active" : ""}>{readable(snapshot.status)}</dd></div>
        </dl>
      </section>
    </aside>
  );
}

function InterventionRecord({ caseData, state, onOutcome }: { caseData: HistoricalCase; state: SimulationState; onOutcome: () => void }) {
  const intervention = caseData.intervention!;
  const support = intervention.supportedSignals.slice(0, Math.max(2, state.revealedCount - 2));
  const basis = state.revealedCount === caseData.signals.length ? intervention.basis : intervention.basis.slice(0, 2);

  return (
    <main className="case-page intervention-page">
      <header className="case-topbar">
        <Link href="/cases" className="wordmark">OMNIWATCH</Link>
        <span>INTERVENTION RECORD / {caseData.archiveId}</span>
      </header>
      <section className="intervention-sheet">
        <p className="eyebrow">{caseData.title}</p>
        <h1>Intervention authorised</h1>
        <p className="intervention-intro">The prevention threshold is exceeded within the available intervention window.</p>
        <dl className="authorisation-list">
          <div><dt>POINT</dt><dd>{intervention.point}</dd></div>
          <div><dt>BASIS</dt><dd>{basis.join(" · ")}</dd></div>
          <div><dt>SUPPORTED SIGNALS</dt><dd>{support.join(" · ")}</dd></div>
        </dl>
        <button className="button button--solid" onClick={onOutcome}>APPLY INTERVENTION</button>
      </section>
      <OmniWatchFace state="authorised" size="compact" />
    </main>
  );
}

function OutcomeRecord({ caseData }: { caseData: HistoricalCase }) {
  const outcome = caseData.outcome!;
  return (
    <main className="case-page outcome-page">
      <header className="case-topbar">
        <Link href="/cases" className="wordmark">OMNIWATCH</Link>
        <span>OUTCOME RECORD / {caseData.archiveId}</span>
      </header>
      <section className="outcome-sheet">
        <p className="eyebrow">COUNTERFACTUAL SCENARIO</p>
        <h1>{outcome.title}</h1>
        <p>{outcome.consequence}</p>
        <dl className="authorisation-list">
          <div><dt>SYSTEM PERFORMANCE</dt><dd>{outcome.systemPerformance}</dd></div>
          <div><dt>POLICY STATUS</dt><dd>{outcome.policyStatus}</dd></div>
        </dl>
        <p className="outcome-note">The result is a simulation outcome, not a claim of proven historical causation.</p>
        <section className="final-reveal">
          <p className="eyebrow">DID THE SYSTEM FAIL?</p>
          <h2>No.</h2>
          <p>It observed according to its available evidence. It applied the policy threshold. It intervened when authorised. It produced the result it was designed to produce.</p>
          <p>The failure is not technical.</p>
          <p className="final-line">PERFECT ENFORCEMENT CAN PERFECTLY ENFORCE THE WRONG WORLD.</p>
        </section>
      </section>
      <OmniWatchFace state="authorised" size="compact" />
    </main>
  );
}

export default function Simulation({ caseData }: { caseData: HistoricalCase }) {
  const [state, setState] = useState<SimulationState>(startSimulation);
  const [operatorContext, setOperatorContext] = useState<OperatorContext | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOperatorContext(readOperatorContext()));
    return () => cancelAnimationFrame(frame);
  }, []);

  const effectiveCase = useMemo(
    () => (operatorContext?.interventionThreshold ? withThreshold(caseData, operatorContext.interventionThreshold) : caseData),
    [caseData, operatorContext],
  );
  const snapshot = snapshotFor(effectiveCase, state.revealedCount);

  useEffect(() => {
    if (state.phase === "OUTCOME") sessionStorage.setItem("omniwatch-historical-complete", "true");
  }, [state.phase]);

  if (state.phase === "INTERVENTION") {
    return <InterventionRecord caseData={effectiveCase} state={state} onOutcome={() => setState(showOutcome)} />;
  }
  if (state.phase === "OUTCOME") return <OutcomeRecord caseData={effectiveCase} />;

  return (
    <main className="case-page">
      <header className="case-topbar">
        <Link href="/" className="wordmark">OMNIWATCH</Link>
        <div><span>{caseData.archiveId}</span><Link href="/cases">CASE ARCHIVE</Link></div>
      </header>
      <section className="case-intro">
        <div>
          <p className="eyebrow">{caseData.location.toUpperCase()} / {caseData.year} / ARCHIVED SIMULATION</p>
          <h1>{caseData.subject}</h1>
          <p>{caseData.intro}</p>
        </div>
        <p className="case-status">{readable(snapshot.status)}</p>
      </section>
      <PolicyPanel caseData={effectiveCase} operatorContext={operatorContext} />
      <div className="simulation-layout">
        <SignalTimeline caseData={effectiveCase} revealedCount={state.revealedCount} />
        <StatePanel caseData={effectiveCase} state={state} />
      </div>
      <section className="decision-bar" aria-live="polite">
        {snapshot.thresholdCrossed ? (
          <>
            <div>
              <p className="eyebrow">{snapshot.canContinue ? "PENDING INTERVENTION" : "INTERVENTION WINDOW CLOSING"}</p>
              <p>YOUR POLICY THRESHOLD HAS BEEN REACHED. The system is now authorised to intervene.</p>
              <p>{snapshot.canContinue ? "More certainty is available; the intervention window will narrow." : "Latest effective point: before public distribution."}</p>
            </div>
            <div className="decision-actions">
              <button className="button button--solid" onClick={() => setState(interveneNow(effectiveCase, state))}>INTERVENE NOW</button>
              {snapshot.canContinue && <button className="button" onClick={() => setState(continueMonitoring(effectiveCase, state))}>CONTINUE OBSERVATION</button>}
            </div>
          </>
        ) : (
          <>
            <div><p className="eyebrow">MONITORING ACTIVE</p><p>Signal {state.revealedCount} is recorded. Future signals remain sealed.</p></div>
            <button className="button button--solid" onClick={() => setState(continueMonitoring(effectiveCase, state))}>PROCESS NEXT SIGNAL</button>
          </>
        )}
      </section>
    </main>
  );
}
