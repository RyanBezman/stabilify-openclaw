import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from "react-native-svg";

type ProgressChartPoint = {
  value: number;
  label: string;
};

type ProgressChartProps = {
  points: ProgressChartPoint[];
  className?: string;
  height?: number;
  lineColor?: string;
};

export default function ProgressChart({
  points,
  className,
  height = 110,
  lineColor = "#a855f7",
}: ProgressChartProps) {
  const [chartWidth, setChartWidth] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;
  const [pulseValue, setPulseValue] = useState(0);
  const hasData = points.length > 0;
  const paddingX = 8;
  const paddingY = 10;
  const gradientId = useMemo(
    () => `progressFill-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  useEffect(() => {
    if (!hasData) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [hasData, pulse]);

  useEffect(() => {
    const subscription = pulse.addListener(({ value }) => {
      setPulseValue(value);
    });

    return () => {
      pulse.removeListener(subscription);
    };
  }, [pulse]);

  const pulseRadius = 12 + pulseValue * 6;
  const pulseOpacity = 0.3 - pulseValue * 0.25;

  const values = useMemo(() => points.map((point) => point.value), [points]);
  const minValue = hasData ? Math.min(...values) : 0;
  const maxValue = hasData ? Math.max(...values) : 0;
  const range = hasData ? Math.max(maxValue - minValue, 0.5) : 1;

  const { linePath, areaPath, chartPoints } = useMemo(() => {
    if (!hasData || !chartWidth) {
      return {
        linePath: "",
        areaPath: "",
        chartPoints: [] as { x: number; y: number }[],
      };
    }

    const innerWidth = Math.max(chartWidth - paddingX * 2, 1);
    const innerHeight = Math.max(height - paddingY * 2, 1);

    const coords = points.map((point, index) => {
      const x =
        points.length === 1
          ? paddingX + innerWidth / 2
          : paddingX + (innerWidth * index) / (points.length - 1);
      const normalized = (point.value - minValue) / range;
      const y = paddingY + (innerHeight - normalized * innerHeight);
      return { x, y };
    });

    const nextLinePath = coords
      .map((point, index) =>
        index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
      )
      .join(" ");

    const baseY = height - paddingY;
    const nextAreaPath =
      coords.length > 0
        ? `${nextLinePath} L ${coords[coords.length - 1].x} ${baseY} L ${coords[0].x} ${baseY} Z`
        : "";

    return {
      linePath: nextLinePath,
      areaPath: nextAreaPath,
      chartPoints: coords,
    };
  }, [chartWidth, hasData, height, minValue, paddingX, paddingY, points, range]);

  return (
    <View
      className={`overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60 ${
        className ?? ""
      }`}
      style={{ height }}
      onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
    >
      {chartWidth > 0 && hasData ? (
        <Svg width={chartWidth} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {areaPath ? <Path d={areaPath} fill={`url(#${gradientId})`} /> : null}
          {linePath ? <Path d={linePath} stroke={lineColor} strokeWidth={3} fill="none" /> : null}

          {chartPoints.map((point, index) => {
            const isLast = index === chartPoints.length - 1;
            return (
              <G key={`point-${index}`}>
                {isLast ? (
                  <>
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={pulseRadius}
                      fill="#c084fc"
                      opacity={pulseOpacity}
                    />
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={7}
                      fill="rgba(192,132,252,0.28)"
                      stroke="#c084fc"
                      strokeWidth={2}
                    />
                  </>
                ) : null}
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={isLast ? 5 : 4}
                  fill={isLast ? "#ffffff" : "#c4b5fd"}
                  stroke={isLast ? "#c084fc" : undefined}
                  strokeWidth={isLast ? 2 : undefined}
                />
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

export type { ProgressChartPoint, ProgressChartProps };
