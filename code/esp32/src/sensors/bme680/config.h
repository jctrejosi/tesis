#pragma once
#include <cstdint>

namespace bme680 {

  struct Config {
      // --- sistema ---
      unsigned long interval_ms = 10000;
      bool simulation = false;

      // --- oversampling ---
      uint8_t temp_oversample = 8;
      uint8_t hum_oversample = 2;
      uint8_t press_oversample = 4;

      // --- filtro ---
      uint8_t iir_filter = 3;

      // --- gas sensor ---
      uint16_t gas_heater_temp = 320;
      uint16_t gas_heater_duration = 150;
  };

}