#include "sensors/as7341/publisher.h"
#include "mqtt/telemetry_publisher.h"
#include <ArduinoJson.h>

namespace as7341 {

    void Publisher::publish(const AS7341Data& data) {
        StaticJsonDocument<384> doc;
        JsonObject metrics = doc.to<JsonObject>();
        
        metrics["f1_415nm"] = data.f1_415nm;
        metrics["f2_445nm"] = data.f2_445nm;
        metrics["f3_480nm"] = data.f3_480nm;
        metrics["f4_515nm"] = data.f4_515nm;
        metrics["f5_555nm"] = data.f5_555nm;
        metrics["f6_590nm"] = data.f6_590nm;
        metrics["f7_630nm"] = data.f7_630nm;
        metrics["f8_680nm"] = data.f8_680nm;
        metrics["clear"]   = data.clear;
        metrics["nir"]     = data.nir;
        
        publish_telemetry("as7341", metrics);
    }
}