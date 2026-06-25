#pragma once

#include "sensors/bme680/config.h"
#include "sensors/as7341/config.h"
#include "sensors/mhz19b/config.h"
#include "sensors/soil_ec_rs485/config.h"

namespace sensors {

    // ===== lifecycle =====
    void begin();

    void update_individual();
    void update_global_sync();

    // ===== publish inmediato =====
    void publish_all_now();
    void publish_bme680_now();
    void publish_as7341_now();
    void publish_mhz19b_now();
    void publish_soil_ec_rs485_now();

    // ===== config API =====
    bool apply_bme680_config(const bme680::Config& cfg);
    bool apply_as7341_config(const as7341::Config& cfg);
    bool apply_mhz19b_config(const mhz19b::Config& cfg);
    bool apply_soil_ec_rs485_config(const soil_ec_rs485::Config& cfg);

    void publish_as7341_config();
    void publish_bme680_config();
}