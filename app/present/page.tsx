import Link from "next/link";
import { presentDaySignals, presentDaySimulation } from "@/data/present";

export default function PresentPage() {
  return (
    <main className="present-page">
      <header className="case-topbar"><Link href="/" className="wordmark">OMNIWATCH</Link><span>PRESENT-DAY REVEAL / ESTONIA 2026</span></header>
      <section className="present-heading">
        <p className="eyebrow">ANONYMOUS SIMULATION</p>
        <h1>Estonia — 2026</h1>
        <p>{presentDaySimulation.subject}</p>
      </section>
      <section className="present-record">
        <div className="section-heading"><div><p className="eyebrow">ILLUSTRATIVE SIGNAL CHAIN</p><h2>Separate components, connected in simulation</h2></div><span>SCENARIO OUTPUT</span></div>
        <ol className="present-timeline">
          {presentDaySignals.map(([time, source, detail, confidence]) => <li key={time}><time>{time}</time><div><strong>{source}</strong><span>{detail}</span></div><b>{confidence}</b></li>)}
        </ol>
        <p className="present-threshold">PREVENTION THRESHOLD EXCEEDED</p>
      </section>
      <section className="disclosure">
        {presentDaySimulation.disclosure.map((line) => <p key={line}>{line}</p>)}
      </section>
      <Link className="button" href="/cases">RETURN TO CASE ARCHIVE</Link>
    </main>
  );
}
