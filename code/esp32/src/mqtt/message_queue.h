#ifndef MQTT_MESSAGE_QUEUE_H
#define MQTT_MESSAGE_QUEUE_H

#include <Arduino.h>

#define QUEUE_CAPACITY 20       // ajusta según tu memoria disponible
#define TOPIC_MAX_LEN  64
#define PAYLOAD_MAX_LEN 256

enum class MessagePriority { LOW, HIGH };

struct QueuedMessage {
    char topic[TOPIC_MAX_LEN];
    char payload[PAYLOAD_MAX_LEN];
    MessagePriority priority;
};

class MessageQueue {
public:
    bool push(const char* topic, const char* payload, MessagePriority priority = MessagePriority::LOW);
    bool pop(QueuedMessage& msg);
    bool is_empty() const;

private:
    QueuedMessage buffer[QUEUE_CAPACITY];
    int head = 0;
    int tail = 0;
    int count = 0;
};

#endif