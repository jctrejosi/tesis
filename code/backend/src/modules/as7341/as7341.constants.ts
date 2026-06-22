export const AS7341_TOPICS = {
  data: 'growbox/as7341/data',
  read: 'growbox/as7341/read',
  config: 'growbox/as7341/config',
} as const;

export const AS7341_DEFAULT_CONFIG = {
  sensor: 'as7341',
  interval_ms: 10000,
  simulation: false,
  atime: 29,
  astep: 599,
  gain: 128,
  led_enabled: false,
  led_current_ma: 10,
} as const;
