#pragma once

#include <Arduino.h>
#include "message_queue.h"

void setup_wifi();
void setup_mqtt();

bool reconnect_mqtt();
bool publish_message(const char* topic, const char* payload, MessagePriority priority = MessagePriority::PRIORITY_LOW);

void mqtt_loop();
void mqtt_callback(char* topic, byte* payload, unsigned int length);

void publish_boot_message();