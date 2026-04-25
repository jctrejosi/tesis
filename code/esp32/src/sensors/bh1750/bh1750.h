#pragma once

#include <Arduino.h>

namespace bh1750 {

    class BH1750Driver {
    private:
        bool simulation_mode;
        bool hardware_ready;

    public:
        BH1750Driver();

        /**
         * Inicializa el sensor.
         * @return true si inicializa correctamente (o en simulación)
         */
        bool begin();

        /**
         * Activa o desactiva modo simulación
         */
        void set_simulation_mode(bool enabled);

        /**
         * Lee la iluminancia en lux
         * @return valor en lux o NAN si falla
         */
        float read();

        /**
         * Indica si el hardware está disponible
         */
        bool is_ready() const;
    };

}