export interface SparklinePaths {
  linePath: string;
  areaPath: string;
}

export function buildSparklinePaths(
  data: number[],
  width: number,
  height: number,
  padding = 1
): SparklinePaths | null {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padding + (1 - (v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return { linePath, areaPath };
}
