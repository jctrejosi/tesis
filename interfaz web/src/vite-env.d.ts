/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del plant-service (FastAPI). Por defecto http://localhost:8000 */
  readonly VITE_PLANT_SERVICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
