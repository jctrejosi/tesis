#pragma once

#include "sensors/as7341/config.h"
#include "sensors/as7341/driver.h"

namespace as7341 {

class Sensor {
public:
    Sensor();

    void init();

    AS7341Data read();

    bool apply_config(const Config& cfg);
    Config get_config() const;

    void set_simulation(bool enabled);

    AS7341Driver& get_driver();
    const AS7341Driver& get_driver() const;

    void publish_as7341_config();

private:
    AS7341Driver driver;
    Config config;
};

}