import Link from "next/link";
import { notFound } from "next/navigation";
import Simulation from "@/components/Simulation";
import { findCase, historicalCases } from "@/data/cases";

export function generateStaticParams() {
  return historicalCases.map(({ id }) => ({ id }));
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseData = findCase(id);
  if (!caseData) notFound();

  if (caseData.curationStatus === "PENDING") {
    return (
      <main className="archive-page pending-page">
        <header className="case-topbar"><Link href="/" className="wordmark">OMNIWATCH</Link><Link href="/cases">CASE ARCHIVE</Link></header>
        <section className="pending-sheet">
          <p className="eyebrow">{caseData.archiveId} / {caseData.year}</p>
          <h1>{caseData.title}</h1>
          <p>Manual case curation is pending. No historical signals or intervention claim have been published for this archive file.</p>
          <Link className="button" href="/cases">RETURN TO ARCHIVE</Link>
        </section>
      </main>
    );
  }

  return <Simulation caseData={caseData} />;
}
