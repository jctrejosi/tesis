#pragma once

#include "sensors/bme680/config.h"
#include "sensors/bh1750/config.h"
#include "sensors/ds18b20/config.h"
#include "sensors/mhz19b/config.h"
#include "sensors/soil_ec_rs485/config.h"
#include "sensors/dfrobot_sen0193/config.h"

namespace sensors {

    // ===== lifecycle =====
    void begin();

    void update_individual();
    void update_global_sync();

    // ===== publish inmediato =====
    void publish_bme680_now();
    void publish_bh1750_now();
    void publish_ds18b20_soil_now();
    void publish_ds18b20_air_now();
    void publish_mhz19b_now();
    void publish_soil_ec_rs485_now();
    void publish_dfrobot_sen0193_now();

    // ===== config API =====
    bool apply_bme680_config(const bme680::Config& cfg);
    bool apply_bh1750_config(const bh1750::Config& cfg);
    bool apply_ds18b20_soil_config(const ds18b20::Config& cfg);
    bool apply_ds18b20_air_config(const ds18b20::Config& cfg);
    bool apply_mhz19b_config(const mhz19b::Config& cfg);
    bool apply_soil_ec_rs485_config(const soil_ec_rs485::Config& cfg);
    bool apply_dfrobot_sen0193_config(const dfrobot_sen0193::Config& cfg);

}