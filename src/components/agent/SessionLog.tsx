"use client";

import { useEffect, useRef } from "react";

export default function SessionLog({ entries }: { entries: string[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="bg-[#0d0d0d] rounded-xl border border-[var(--border)] font-mono text-xs overflow-hidden">
      <div className="px-3 py-1.5 border-b border-[var(--border)] text-[var(--text-secondary)] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
        Session Log
      </div>
      <div className="p-3 max-h-48 overflow-y-auto space-y-0.5">
        {entries.length === 0 && (
          <span className="text-[var(--text-secondary)]">Waiting for activity...</span>
        )}
        {entries.map((line, i) => (
          <div key={i} className="text-[var(--text-secondary)] leading-5">
            <span className="text-[var(--accent-primary)] mr-2">$</span>
            {line}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
