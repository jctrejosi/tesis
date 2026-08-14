/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend NestJS (gateway único para la web).
   * Por defecto http://localhost:3000; el backend reenvía /plant-service/*
   * a plant-service. */
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
