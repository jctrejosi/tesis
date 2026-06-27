export interface Bme680Derived {
  dew_point: number | null;
  vpd: number | null;
  altitude: number | null;
}

export function calculateBme680(
  metrics: Record<string, number>,
): Bme680Derived {
  const temp = metrics['temperature'];
  const hum = metrics['humidity'];
  const press = metrics['pressure'];

  let dew_point: number | null = null;
  let vpd: number | null = null;
  let altitude: number | null = null;

  if (temp != null && hum != null) {
    // Punto de rocío (fórmula de Magnus)
    const a = 17.27;
    const b = 237.7;
    const gamma = (a * temp) / (b + temp) + Math.log(hum / 100);
    dew_point = (b * gamma) / (a - gamma);

    // VPD (Déficit de Presión de Vapor) en kPa
    const es = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    const ea = es * (hum / 100);
    vpd = es - ea;
  }

  // Altitud estimada desde presión (hPa)
  if (press != null) {
    altitude = 44330 * (1 - Math.pow(press / 1013.25, 1 / 5.255));
  }

  return { dew_point, vpd, altitude };
}
