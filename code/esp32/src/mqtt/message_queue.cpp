#include "message_queue.h"

void MessageQueue::push(const char* topic, const char* payload) {
    if (count >= QUEUE_CAPACITY) {
        // Cola llena: descartamos el más antiguo (política FIFO)
        head = (head + 1) % QUEUE_CAPACITY;
        count--;
    }

    QueuedMessage& msg = buffer[tail];
    strncpy(msg.topic, topic, TOPIC_MAX_LEN - 1);
    msg.topic[TOPIC_MAX_LEN - 1] = '\0';
    strncpy(msg.payload, payload, PAYLOAD_MAX_LEN - 1);
    msg.payload[PAYLOAD_MAX_LEN - 1] = '\0';

    tail = (tail + 1) % QUEUE_CAPACITY;
    count++;
}

bool MessageQueue::pop(QueuedMessage& msg) {
    if (count == 0) return false;
    msg = buffer[head];
    head = (head + 1) % QUEUE_CAPACITY;
    count--;
    return true;
}

bool MessageQueue::is_empty() const {
    return count == 0;
}