export interface Mhz19bDerived {
  co2_change_rate: number | null;
}

// Necesita acceso a la lectura anterior para calcular tasa de cambio
// Se maneja en el servicio
export function calculateMhz19b(
  currentCo2: number,
  previousCo2: number | null,
  timeDiffSeconds: number,
): Mhz19bDerived {
  let co2_change_rate: number | null = null;

  if (previousCo2 != null && timeDiffSeconds > 0) {
    co2_change_rate = (currentCo2 - previousCo2) / timeDiffSeconds;
  }

  return { co2_change_rate };
}
