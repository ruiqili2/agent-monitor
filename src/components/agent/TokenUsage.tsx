"use client";

export default function TokenUsage({
  data,
}: {
  data: { timestamp: number; input: number; output: number; total: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="text-center text-[var(--text-secondary)] text-sm py-8">
        No token usage data yet
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const barWidth = Math.max(4, Math.floor(300 / data.length) - 2);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-[2px] h-32 px-2">
        {data.slice(-30).map((d, i) => {
          const inputH = (d.input / max) * 100;
          const outputH = (d.output / max) * 100;
          return (
            <div key={i} className="flex flex-col justify-end" style={{ width: barWidth }}>
              <div
                className="rounded-t-sm"
                style={{ height: `${outputH}%`, background: "var(--accent-info)", minHeight: 1 }}
              />
              <div
                style={{ height: `${inputH}%`, background: "var(--accent-primary)", minHeight: 1 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] px-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" /> Input
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-info)]" /> Output
        </span>
        <span className="ml-auto">
          Total: {(data.reduce((s, d) => s + d.total, 0) / 1000).toFixed(1)}k
        </span>
      </div>
    </div>
  );
}
