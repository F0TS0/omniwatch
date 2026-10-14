import Link from "next/link";
import { historicalCases } from "@/data/cases";

export default function CasesPage() {
  return (
    <main className="archive-page">
      <header className="case-topbar">
        <Link href="/" className="wordmark">OMNIWATCH</Link>
        <span>ARCHIVE / HISTORICAL SIMULATIONS</span>
      </header>
      <section className="archive-heading">
        <p className="eyebrow">CASE SELECTION</p>
        <h1>Archived case files</h1>
        <p>Select a local deterministic simulation. Luther is the complete reference case for this release.</p>
      </section>
      <div className="case-files">
        {historicalCases.map((caseData) => (
          <article className={`case-file ${caseData.recommended ? "is-recommended" : ""}`} key={caseData.id}>
            <header><span>{caseData.archiveId}</span><span>{caseData.curationStatus === "READY" ? "ARCHIVED SIMULATION" : "CURATION PENDING"}</span></header>
            <p className="eyebrow">{caseData.location.toUpperCase()} / {caseData.year}</p>
            <h2>{caseData.subject}</h2>
            <p>{caseData.intro}</p>
            {caseData.recommended && <span className="recommendation">RECOMMENDED CASE</span>}
            <Link className="file-link" href={`/case/${caseData.id}`}>{caseData.curationStatus === "READY" ? "SELECT CASE" : "VIEW ARCHIVE STATUS"}</Link>
          </article>
        ))}
      </div>
    </main>
  );
}
