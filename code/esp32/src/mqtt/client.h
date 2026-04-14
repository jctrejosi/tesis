#pragma once

#include <Arduino.h>

void setup_wifi();
void setup_mqtt();

bool reconnect_mqtt();

bool publish_message(const char* topic, const char* payload);

void mqtt_loop();