#include "sensors/as7341/publisher.h"
#include "mqtt/telemetry_publisher.h"
#include <ArduinoJson.h>

namespace as7341 {

    void Publisher::publish(const AS7341Data& data) {
        StaticJsonDocument<512> doc;
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

    void Publisher::publish_config(const Config& cfg) {
        StaticJsonDocument<256> doc;
        doc["interval_ms"]      = cfg.interval_ms;
        doc["simulation"]       = cfg.simulation;
        doc["atime"]            = cfg.atime;
        doc["astep"]            = cfg.astep;
        doc["gain"]             = cfg.gain;
        doc["led_enabled"]      = cfg.led_enabled;
        doc["led_current_ma"]   = cfg.led_current_ma;

        char buffer[256];
        size_t len = serializeJson(doc, buffer, sizeof(buffer));
        if (len == 0 || len >= sizeof(buffer)) {
            Serial.println("[AS7341] error serializando config");
            return;
        }

        Serial.print("[AS7341] publish config: ");
        Serial.println(buffer);
        if (!publish_message("growbox/as7341/config", buffer)) {
            Serial.println("[AS7341] error MQTT config");
        }
    }
}