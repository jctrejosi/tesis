#pragma once

#include "sensors/bme680/config.h"
#include "sensors/bh1750/driver.h"

namespace sensors {

    void begin();

    void update_individual();
    void update_global_sync();

    // BME680
    void publish_bme680_now();
    bool apply_bme680_config(const bme680::Config& cfg);

    // BH1750
    void publish_bh1750_now();
    bool apply_bh1750_config(const bh1750::Config& cfg);

    // DS18B20
    void publish_ds18b20_now();
    bool apply_ds18b20_config(const ds18b20::Config& cfg);

    // MH-Z19B
    void publish_mhz19b_now();
    bool apply_mhz19b_config(const mhz19b::Config& cfg);

}