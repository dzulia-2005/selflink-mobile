import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { degreesToXY } from '@utils/astroCoordinates';

type WheelProps = {
  planets: Record<string, { lon: number; sign?: string }> | undefined;
  houses?: Record<string, { cusp_lon: number; sign?: string }>;
  size?: number;
};

const ZODIAC_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

const PLANET_COLORS: Record<string, string> = {
  sun: '#F59E0B',
  moon: '#E5E7EB',
  mercury: '#10B981',
  venus: '#F472B6',
  mars: '#EF4444',
  jupiter: '#3B82F6',
  saturn: '#A3A3A3',
  uranus: '#22D3EE',
  neptune: '#6366F1',
  pluto: '#78716C',
};

export function AstroWheel({ planets, houses, size = 280 }: WheelProps) {
  const center = size / 2;
  const outerRadius = center - 8;
  const innerRadius = outerRadius - 22;

  return (
    <Svg width={size} height={size}>
      <G>
        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke="#CBD5E1"
          strokeWidth={2}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke="#1E293B"
          strokeWidth={2}
          fill="none"
        />

        {ZODIAC_SIGNS.map((sign, index) => {
          const startDeg = index * 30;
          const { x, y } = degreesToXY(startDeg + 15, outerRadius - 8, center, center);
          const label = sign.slice(0, 3).toUpperCase();
          return (
            <SvgText
              key={sign}
              x={x}
              y={y}
              fill="#CBD5E1"
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {label}
            </SvgText>
          );
        })}

        {houses &&
          Object.entries(houses).map(([houseNum, placement]) => {
            const deg = placement.cusp_lon % 360;
            const start = degreesToXY(deg, innerRadius, center, center);
            return (
              <G key={houseNum}>
                <Line
                  x1={start.x}
                  y1={start.y}
                  x2={center}
                  y2={center}
                  stroke="#475569"
                  strokeWidth={1}
                />
                {(() => {
                  const labelPoint = degreesToXY(deg, innerRadius + 12, center, center);
                  return (
                    <SvgText
                      x={labelPoint.x}
                      y={labelPoint.y}
                      fill="#94A3B8"
                      fontSize="8"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {houseNum}
                    </SvgText>
                  );
                })()}
              </G>
            );
          })}

        {planets &&
          Object.entries(planets).map(([name, placement]) => {
            const deg = placement.lon % 360;
            const point = degreesToXY(deg, innerRadius - 10, center, center);
            const color = PLANET_COLORS[name.toLowerCase()] ?? '#F8FAFC';
            return (
              <G key={name}>
                <Circle cx={point.x} cy={point.y} r={5} fill={color} />
                <SvgText
                  x={point.x}
                  y={point.y - 10}
                  fill="#E2E8F0"
                  fontSize="8"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {name.slice(0, 2).toUpperCase()}
                </SvgText>
              </G>
            );
          })}
      </G>
    </Svg>
  );
}
