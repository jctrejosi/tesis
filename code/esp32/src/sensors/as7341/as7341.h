#pragma once

#include <Arduino.h>

namespace as7341 {

    struct AS7341Data {
        float f1_415nm;
        float f2_445nm;
        float f3_480nm;
        float f4_515nm;
        float f5_555nm;
        float f6_590nm;
        float f7_630nm;
        float f8_680nm;

        float clear;
        float nir;
    };

}