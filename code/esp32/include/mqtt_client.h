#pragma once

void setup_wifi();
void setup_mqtt();
void reconnect_mqtt();
bool publish_message(const char* topic, const char* payload);
void mqtt_loop();