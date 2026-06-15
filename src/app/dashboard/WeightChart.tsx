interface Point {
  date: string; // YYYY-MM-DD
  weight: number;
}

function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(new Date(y, m - 1, d));
}

/**
 * Gráfico de líneas peso/fecha (SVG puro, sin dependencias).
 * Espera los puntos en orden cronológico (más viejo → más nuevo).
 */
export default function WeightChart({
  data,
  targetWeight,
}: {
  data: Point[];
  targetWeight?: number | null;
}) {
  const W = 600;
  const H = 200;
  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 26;

  const weights = data.map((p) => p.weight);
  const values = [...weights];
  if (targetWeight != null) values.push(targetWeight);

  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const pad = (hi - lo) * 0.15;
  const yMin = lo - pad;
  const yMax = hi + pad;

  const n = data.length;
  const x = (i: number) =>
    padL + (n === 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const y = (w: number) =>
    padT + (1 - (w - yMin) / (yMax - yMin)) * (H - padT - padB);

  const line = data.map((p, i) => `${x(i)},${y(p.weight)}`).join(" ");
  const area = `${padL},${H - padB} ${line} ${x(n - 1)},${H - padB}`;

  const first = data[0];
  const last = data[n - 1];
  const delta = last.weight - first.weight;
  const deltaLabel =
    delta === 0
      ? "Sin cambios"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`;

  const targetY =
    targetWeight != null && targetWeight >= yMin && targetWeight <= yMax
      ? y(targetWeight)
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Progreso
        </span>
        <span
          className={`font-semibold ${
            delta < 0
              ? "text-emerald-600"
              : delta > 0
                ? "text-amber-600"
                : "text-zinc-500"
          }`}
        >
          {deltaLabel}
          <span className="ml-1 font-normal text-zinc-400">
            desde {shortDate(first.date)}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Gráfico de evolución del peso"
      >
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Línea de meta */}
        {targetY != null && (
          <>
            <line
              x1={padL}
              y1={targetY}
              x2={W - padR}
              y2={targetY}
              stroke="#a1a1aa"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={W - padR}
              y={targetY - 4}
              textAnchor="end"
              className="fill-zinc-400"
              fontSize="11"
            >
              meta {targetWeight} kg
            </text>
          </>
        )}

        {/* Área + línea */}
        <polygon points={area} fill="url(#weightFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Puntos */}
        {data.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.weight)} r="3" fill="#10b981" />
        ))}

        {/* Etiquetas Y (min/max) */}
        <text x="4" y={y(hi) + 4} className="fill-zinc-400" fontSize="11">
          {hi.toFixed(1)}
        </text>
        <text x="4" y={y(lo) + 4} className="fill-zinc-400" fontSize="11">
          {lo.toFixed(1)}
        </text>

        {/* Etiquetas X (primera/última fecha) */}
        <text
          x={padL}
          y={H - 6}
          textAnchor="start"
          className="fill-zinc-400"
          fontSize="11"
        >
          {shortDate(first.date)}
        </text>
        <text
          x={W - padR}
          y={H - 6}
          textAnchor="end"
          className="fill-zinc-400"
          fontSize="11"
        >
          {shortDate(last.date)}
        </text>
      </svg>
    </div>
  );
}
