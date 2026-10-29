// react-native-svg ile çizilen basit halka (donut) grafik.
// data: [{ value, color }]
import Svg, { Circle, Path } from 'react-native-svg';

function polar(cx, cy, r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export default function PieChart({ data, size = 200, holeColor = '#fff' }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const r = size / 2;
  if (total <= 0) return null;

  // Tek dilim varsa yay çizilemez, tam daire çiz
  if (data.length === 1) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={r} cy={r} r={r} fill={data[0].color} />
        <Circle cx={r} cy={r} r={r * 0.55} fill={holeColor} />
      </Svg>
    );
  }

  // Her dilimin başlangıç açısı, kendinden önceki dilimlerin toplamıdır
  const slices = data.reduce((acc, d) => {
    const start = acc.length ? acc[acc.length - 1].end : 0;
    acc.push({ color: d.color, start, end: start + (d.value / total) * 360 });
    return acc;
  }, []);

  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => (
        <Path
          key={i}
          d={arcPath(r, r, r, s.start, s.end)}
          fill={s.color}
          stroke={holeColor}
          strokeWidth={1.5}
        />
      ))}
      <Circle cx={r} cy={r} r={r * 0.55} fill={holeColor} />
    </Svg>
  );
}
