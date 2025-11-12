import './ring.css';

type RingItem = { label: string; onClick: () => void };

export function Ring({ items }: { items: RingItem[] }) {
  const R = 160;
  const cx = 0, cy = 0;
  const N = items.length;
  return (
    <div className="ring-root">
      {items.map((it, i) => {
        const theta = (i / N) * 2 * Math.PI - Math.PI / 2;
        const x = cx + R * Math.cos(theta);
        const y = cy + R * Math.sin(theta);
        return (
          <button
            key={i}
            className="ring-bubble"
            style={{ transform: `translate(${x}px, ${y}px)` }}
            onClick={it.onClick}
            title={it.label}
          >
            <span className="ring-label">{it.label}</span>
          </button>
        );
      })}
      <div className="ring-center">⌘</div>
    </div>
  );
}
