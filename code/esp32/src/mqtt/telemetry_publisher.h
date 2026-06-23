#pragma once
#include <ArduinoJson.h>

void publish_telemetry(const char* sensor_alias, const JsonObject& metrics, const char* timestamp = nullptr);