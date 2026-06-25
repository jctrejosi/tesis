#ifndef MQTT_MESSAGE_QUEUE_H
#define MQTT_MESSAGE_QUEUE_H

#include <Arduino.h>

#define QUEUE_CAPACITY 10       // ajusta según tu memoria disponible
#define TOPIC_MAX_LEN  64
#define PAYLOAD_MAX_LEN 256

struct QueuedMessage {
    char topic[TOPIC_MAX_LEN];
    char payload[PAYLOAD_MAX_LEN];
};

class MessageQueue {
public:
    void push(const char* topic, const char* payload);
    bool pop(QueuedMessage& msg);
    bool is_empty() const;

private:
    QueuedMessage buffer[QUEUE_CAPACITY];
    int head = 0;
    int tail = 0;
    int count = 0;
};

#endif