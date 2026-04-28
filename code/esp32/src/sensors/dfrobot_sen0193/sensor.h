#pragma once

#include "sensors/dfrobot_sen0193/driver.h"
#include "sensors/dfrobot_sen0193/config.h"

namespace dfrobot_sen0193 {

    class Sensor : public ISensor {

    private:
        DFRobotSEN0193Driver driver;

    public:
        // inicializa driver + carga config persistida
        void init();

        // lectura del sensor
        SoilMoistureData read() override;

        // aplica configuración externa (MQTT / sistema)
        bool apply_config(const Config& cfg);

        // obtiene configuración actual del driver
        Config get_config() const;

        // acceso directo al driver (uso interno / debug)
        DFRobotSEN0193Driver& get_driver();
    };

}