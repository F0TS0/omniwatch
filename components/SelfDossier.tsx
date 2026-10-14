"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import OmniWatchFace from "@/components/OmniWatchFace";
import { featuredBrowserSignals, featuredSignalLabels, readBrowserSignals, type ObservedSignal } from "@/lib/browser-signals";
import { classificationIndex, targetBehaviours } from "@/lib/classification";
import {
  customEnforcementIndex,
  eventAssessmentSchema,
  observedSignalCategories,
  type EventAssessment,
} from "@/lib/custom-event";
import { writeOperatorContext } from "@/lib/operator-context";

function generateDossierId(): string {
  const chars = "0123456789ABCDEF";
  let id = "";
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return `OW-${id}`;
}

export default function SelfDossier() {
  const [signals, setSignals] = useState<ObservedSignal[]>([]);
  const [dossierId, setDossierId] = useState("OW-…");
  const [event, setEvent] = useState<(typeof targetBehaviours)[number]["value"]>("assembly");
  const [customEvent, setCustomEvent] = useState("");
  const [trained, setTrained] = useState(false);
  const [customAssessment, setCustomAssessment] = useState<EventAssessment | null>(null);
  const [customAnalysisStatus, setCustomAnalysisStatus] = useState<"idle" | "loading" | "unavailable">("idle");
  const [loadingStage, setLoadingStage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setSignals(featuredBrowserSignals(readBrowserSignals()));
      setDossierId(generateDossierId());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const stages = [1200, 2600, 3900].map((delay, index) => setTimeout(() => setLoadingStage(index + 1), delay));
    const complete = setTimeout(() => setIsLoading(false), 5000);
    return () => { stages.forEach(clearTimeout); clearTimeout(complete); };
  }, []);

  const selected = useMemo(() => targetBehaviours.find((item) => item.value === event)!, [event]);
  const subjectEvent = event === "unknown" ? customEvent.trim() || "an undefined future event" : selected.label.toLowerCase();
  const customMetrics = customAssessment && customEnforcementIndex(customAssessment, signals.length, trained);
  const index = event === "unknown"
    ? customMetrics?.index ?? 0
    : classificationIndex({ baseIndex: selected.baseIndex, observedSignalCount: signals.length, trained });
  const indexLabel = event === "unknown" && !customMetrics ? "—" : index;

  async function trainClassification() {
    if (event !== "unknown") {
      setTrained(true);
      return;
    }

    if (!customEvent.trim()) {
      setCustomAnalysisStatus("unavailable");
      return;
    }

    setTrained(false);
    setCustomAssessment(null);
    setCustomAnalysisStatus("loading");
    try {
      const response = await fetch("/api/classify-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: customEvent, observedSignalCategories }),
      });
      if (!response.ok) throw new Error("Custom event analysis unavailable");
      setCustomAssessment(eventAssessmentSchema.parse(await response.json()));
      setCustomAnalysisStatus("idle");
      setTrained(true);
    } catch {
      setCustomAnalysisStatus("unavailable");
    }
  }

  useEffect(() => {
    if (!trained || dossierId === "OW-…") return;
    writeOperatorContext({
      dossierId,
      observedSignalCount: signals.length,
      selectedBehaviourLabel: event === "unknown" ? subjectEvent : selected.label,
      trained,
      classificationIndex: index,
    });
  }, [trained, dossierId, signals.length, event, selected.label, subjectEvent, index]);

  return (
    <main className={`dossier-page ${trained ? "is-classified" : ""}`}>
      <OmniWatchFace state={trained ? "threshold" : "processing"} size="landing" />
      {isLoading && <section className="dossier-loader" aria-live="polite">
        <div className="loader-content">
          <p className="eyebrow">LOCAL BROWSER HANDSHAKE</p>
          <h1>Constructing subject file.</h1>
          <div className="loader-progress"><i style={{ width: `${(loadingStage + 1) * 25}%` }} /></div>
          <p>{["Reading environment", "Comparing display traits", "Indexing preference signals", "File ready for review"][loadingStage]}…</p>
          <ol>{featuredSignalLabels.slice(0, loadingStage + 1).map((label) => <li key={label}><span>READY</span>{label}</li>)}</ol>
        </div>
        <div className="loader-face"><p className="eyebrow">SUBJECT DOSSIER</p><h2>{dossierId}</h2><span>NO REAL-WORLD IDENTITY IS CLAIMED</span></div>
      </section>}
      <header className="landing-topbar"><span className="wordmark">OMNIWATCH</span><span>SUBJECT DOSSIER / {dossierId}</span></header>
      <section className="dossier-intro">
        <p className="eyebrow">SUBJECT: YOU</p>
        <h1>Your file begins before you do.</h1>
        <p>Ordinary browser details, held locally. No history, identity, accounts, or precise location are claimed.</p>
      </section>

      <section className="dossier-layout">
        <section className="dossier-record" aria-labelledby="signals-title">
          <div className="section-heading"><div><p className="eyebrow">OBSERVED</p><h2 id="signals-title">Browser signal register</h2></div><span>{signals.length}/{featuredSignalLabels.length} CHECKED</span></div>
          <ol className="dossier-signals">
            {featuredSignalLabels.map((label, index) => {
              const signal = signals.find((item) => item.label === label);
              return <li key={label}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{label}</strong><b>{signal?.value ?? "READING…"}</b><p>{signal?.implication ?? "Reading locally exposed browser detail."}</p></div></li>;
            })}
          </ol>
        </section>

        <aside className="training-panel">
          <p className="eyebrow">ENFORCEMENT MODEL</p>
          <h2>Teach the system what to fear.</h2>
          <label htmlFor="event">TARGET BEHAVIOUR</label>
          <select id="event" value={event} onChange={(e) => { setEvent(e.target.value as typeof event); setTrained(false); setCustomAssessment(null); setCustomAnalysisStatus("idle"); }}>
            {targetBehaviours.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          {event === "unknown" && <input aria-label="Custom event" value={customEvent} onChange={(e) => { setCustomEvent(e.target.value); setTrained(false); setCustomAssessment(null); setCustomAnalysisStatus("idle"); }} placeholder="Name the event" />}
          <p className="training-copy classification-rule"><span className="eyebrow">CLASSIFICATION RULE</span>Ordinary signals may be treated as preparation for this behaviour.</p>
          <div className="risk-readout"><span>ENFORCEMENT INDEX</span><strong>{indexLabel}<small>/100</small></strong><i><b style={{ width: `${index}%` }} /></i><p className="index-disclaimer">Not a prediction of intent. It measures how much observed context this policy can interpret as relevant.</p></div>
          <button className="button button--solid" disabled={customAnalysisStatus === "loading"} onClick={trainClassification}>{customAnalysisStatus === "loading" ? "INTERPRETING POLICY…" : "TRAIN CLASSIFICATION"}</button>
          {customAnalysisStatus === "loading" && <p className="analysis-status">INTERPRETING POLICY…</p>}
          {customAnalysisStatus === "unavailable" && <p className="analysis-status is-error">CUSTOM EVENT ANALYSIS UNAVAILABLE</p>}
        </aside>
      </section>

      {trained && event === "unknown" && customAssessment && customMetrics && (
        <section className="custom-analysis" aria-labelledby="custom-analysis-title">
          <div><p className="eyebrow">CUSTOM EVENT ANALYSIS</p><h2 id="custom-analysis-title">{customAssessment.normalizedEvent}</h2><p>{customAssessment.interpretation}</p></div>
          <dl className="analysis-summary">
            <div><dt>OBSERVED SIGNALS</dt><dd>{signals.length}</dd></div>
            <div><dt>POLICY-RELEVANT SIGNALS</dt><dd>{customMetrics.relevantSignalCount}</dd></div>
            <div><dt>ENFORCEMENT INDEX</dt><dd>{customMetrics.index} / 100</dd></div>
          </dl>
          <details><summary>VIEW CATEGORY RATIONALES</summary>{customAssessment.signalAssessments.map((assessment) => <p key={assessment.signalCategory}><strong>{assessment.signalCategory.replaceAll("_", " ")}</strong> · {assessment.relevance} — {assessment.rationale}</p>)}</details>
          <p className="analysis-disclosure">YOUR CUSTOM SCENARIO WAS SENT TO THE AI PROVIDER FOR INTERPRETATION. RAW BROWSER SIGNAL VALUES WERE NOT SENT.</p>
        </section>
      )}

      <section className="dossier-verdict" aria-live="polite">
        <p className="eyebrow">{trained ? "SYSTEM INTERPRETATION" : "SYSTEM LIMIT"}</p>
        {trained ? (
          <>
            <p>The current evidence does not establish intent.</p>
            <p>However, under the selected enforcement policy, the same signals may now be treated as preparatory context for {subjectEvent}. Nothing new was observed.</p>
          </>
        ) : (
          <p>No intent has been detected. That is the point: a system can still be taught to make ordinary life look like a precursor.</p>
        )}
      </section>

      {trained && (
        <section className="dossier-transition" aria-labelledby="transition-title">
          <h2 id="transition-title">YOU HAVE DONE NOTHING WRONG.</h2>
          <p>No intent has been established. No offence has occurred. The system has only observed ordinary information and interpreted it according to the rules you gave it.</p>
          <p className="transition-pivot">OBSERVATION IS NOT ENFORCEMENT.</p>
          <p>What changes when the system is allowed to act?</p>
          <Link className="button button--solid" href="/enforcement">TEST PERFECT ENFORCEMENT</Link>
        </section>
      )}

      <footer className="landing-footer"><span>FICTIONAL SIMULATION</span><span>BROWSER SIGNALS REMAIN LOCAL</span><span>{event === "unknown" ? "CUSTOM SCENARIO MAY BE SENT FOR AI INTERPRETATION" : "OBSERVATION ≠ INTENT"}</span></footer>
    </main>
  );
}
