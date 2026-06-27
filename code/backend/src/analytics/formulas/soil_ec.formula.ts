export interface SoilEcDerived {
  ec_compensated: number | null;
  tds: number | null;
  salinity: number | null;
}

export function calculateSoilEc(
  metrics: Record<string, number>,
): SoilEcDerived {
  const ec = metrics['ec'];
  const temp = metrics['temperature'];

  let ec_compensated: number | null = null;
  let tds: number | null = null;
  let salinity: number | null = null;

  if (ec != null) {
    // EC compensada a 25°C
    if (temp != null) {
      ec_compensated = ec / (1 + 0.02 * (temp - 25));
    } else {
      ec_compensated = ec;
    }

    // TDS (Sólidos Disueltos Totales) en ppm
    tds = ec * 640;

    // Salinidad estimada en ppm
    salinity = ec * 500;
  }

  return { ec_compensated, tds, salinity };
}
