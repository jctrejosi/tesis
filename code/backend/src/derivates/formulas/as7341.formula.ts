export interface As7341Derived {
  ndvi: number | null;
  par: number | null;
  lux_estimado: number | null;
  red_edge_ratio: number | null;
  chlorophyll_index: number | null;
  nir_reflectance: number | null;
  clear_par_ratio: number | null;
}

export function calculateAs7341(
  metrics: Record<string, number>,
): As7341Derived {
  const f1 = metrics['f1_415nm'];
  const f2 = metrics['f2_445nm'];
  const f3 = metrics['f3_480nm'];
  const f4 = metrics['f4_515nm'];
  const f5 = metrics['f5_555nm'];
  const f6 = metrics['f6_590nm'];
  const f7 = metrics['f7_630nm'];
  const f8 = metrics['f8_680nm'];
  const nir = metrics['nir'];
  const clear = metrics['clear'];

  let ndvi: number | null = null;
  let par: number | null = null;
  let lux_estimado: number | null = null;
  let red_edge_ratio: number | null = null;
  let chlorophyll_index: number | null = null;
  let nir_reflectance: number | null = null;
  let clear_par_ratio: number | null = null;

  // NDVI = (NIR - Red) / (NIR + Red)
  if (nir != null && f6 != null && nir + f6 > 0) {
    ndvi = (nir - f6) / (nir + f6);
  }

  // PAR = suma de canales visibles (400-700nm)
  if (
    f1 != null &&
    f2 != null &&
    f3 != null &&
    f4 != null &&
    f5 != null &&
    f6 != null &&
    f7 != null
  ) {
    par = f1 + f2 + f3 + f4 + f5 + f6 + f7;
  }

  // Lux estimado
  if (f4 != null && f5 != null && f6 != null) {
    lux_estimado = f4 * 0.3 + f5 * 0.6 + f6 * 0.1;
  }

  // Red Edge Ratio
  if (f8 != null && f6 != null && f6 > 0) {
    red_edge_ratio = f8 / f6;
  }

  // Índice de clorofila
  if (f8 != null && f6 != null && f8 + f6 > 0) {
    chlorophyll_index = (f8 - f6) / (f8 + f6);
  }

  // Reflectancia NIR normalizada (NIR / Clear)
  if (nir != null && clear != null && clear > 0) {
    nir_reflectance = nir / clear;
  }

  // Relación Clear/PAR
  if (clear != null && par != null && par > 0) {
    clear_par_ratio = clear / par;
  }

  return {
    ndvi,
    par,
    lux_estimado,
    red_edge_ratio,
    chlorophyll_index,
    nir_reflectance,
    clear_par_ratio,
  };
}
