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

  let angle = 0;
  return (
    <Svg width={size} height={size}>
      {data.map((d, i) => {
        const sweep = (d.value / total) * 360;
        const path = arcPath(r, r, r, angle, angle + sweep);
        angle += sweep;
        return <Path key={i} d={path} fill={d.color} stroke={holeColor} strokeWidth={1.5} />;
      })}
      <Circle cx={r} cy={r} r={r * 0.55} fill={holeColor} />
    </Svg>
  );
}
