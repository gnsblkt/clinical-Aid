"use client";

import { useMemo, useState } from "react";
import { BookOpen, ExternalLink, Search, X } from "lucide-react";

const books = [
  {
    title: "Anatomy & Physiology 2e",
    subject: "Human anatomy and physiology",
    description: "Body systems, structure–function relationships, homeostasis, and foundational clinical correlations.",
    url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/1-introduction",
    tags: "anatomy physiology body systems homeostasis",
  },
  {
    title: "Microbiology",
    subject: "Microbiology and infectious disease foundations",
    description: "Microbial structure, pathogenesis, host defence, antimicrobial mechanisms, epidemiology, and infections by body system.",
    url: "https://openstax.org/books/microbiology/pages/1-introduction",
    tags: "microbiology bacteria virus fungi infection immunity antimicrobial",
  },
];

export default function OpenStaxLibrary() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((book) => [book.title, book.subject, book.description, book.tags].join(" ").toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <button className="side-item openstax-nav" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <BookOpen size={16} /> OpenStax Library
      </button>
      {open && (
        <div className="openstax-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="openstax-dialog" role="dialog" aria-modal="true" aria-labelledby="openstax-title">
            <header className="openstax-header">
              <div className="openstax-heading-icon"><BookOpen size={20} /></div>
              <div className="openstax-heading-copy">
                <h2 id="openstax-title">OpenStax Library</h2>
                <p>Free foundational textbooks, opened directly at OpenStax.</p>
              </div>
              <button className="openstax-close" onClick={() => setOpen(false)} aria-label="Close OpenStax Library"><X size={19} /></button>
            </header>
            <label className="openstax-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anatomy, microbiology…" />
            </label>
            <div className="openstax-book-list">
              {filtered.map((book) => (
                <article className="openstax-book" key={book.title}>
                  <div className="openstax-book-mark"><BookOpen size={18} /></div>
                  <div className="openstax-book-copy">
                    <h3>{book.title}</h3>
                    <span>{book.subject}</span>
                    <p>{book.description}</p>
                    <a href={book.url} target="_blank" rel="noopener noreferrer">Open original textbook <ExternalLink size={13} /></a>
                  </div>
                </article>
              ))}
              {!filtered.length && <p className="openstax-empty">No matching title in this starter collection. Browse the full OpenStax catalogue below.</p>}
            </div>
            <a className="openstax-catalogue-link" href="https://openstax.org/new-subjects/science-books" target="_blank" rel="noopener noreferrer">
              Explore all OpenStax science textbooks <ExternalLink size={14} />
            </a>
            <div className="openstax-license-note">
              <strong>Source and licensing note</strong>
              <p>Books open on the official OpenStax website. CCA does not copy, host, or ingest their text or figures. Online editions may not show print/PDF page numbers; use the source’s own citation details.</p>
            </div>
            <footer className="openstax-footer">OpenStax is part of Rice University. Textbooks remain the property of their respective rights holders and are subject to their stated licences.</footer>
          </section>
        </div>
      )}
    </>
  );
}
