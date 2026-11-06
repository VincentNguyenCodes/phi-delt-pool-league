const COLORS = ["#b9a6e0", "#c4c9c4", "#e58f6b", "#a6c27a", "#78bfc6", "#e6c06a"];

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export default function Shield({ name }: { name: string }) {
  const color = colorFor(name);
  return (
    <svg className="shield" viewBox="0 0 34 40" aria-hidden="true">
      <path
        d="M17 1.5 31.5 6v13.5c0 9-6.2 15.4-14.5 19C8.700 34.900 2.500 28.500 2.500 19.500V6z"
        fill="#161f1b"
        stroke={color}
        strokeWidth="1.4"
      />
      <text x="17" y="26" textAnchor="middle" fontSize="19" fontStyle="italic" fontWeight="700" fill={color}>
        {name.trim().charAt(0).toUpperCase()}
      </text>
    </svg>
  );
}
