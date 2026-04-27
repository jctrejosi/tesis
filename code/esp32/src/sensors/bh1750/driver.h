#pragma once

#include "sensors/bh1750/config.h"

namespace bh1750 {

    class BH1750Driver {
    private:
        bool simulation_mode;
        bool hardware_ready;
        Config current_config;

    public:
        BH1750Driver();

        /**
         * Inicializa el sensor
         */
        bool begin();

        /**
         * Activa/desactiva simulación
         */
        void set_simulation_mode(bool enabled);

        /**
         * Aplica configuración validada
         */
        bool apply_config(const Config& cfg);

        /**
         * Retorna configuración actual
         */
        Config get_config() const;

        /**
         * Lee iluminancia
         * NAN en caso de error
         */
        BH1750Data read();
    };

}