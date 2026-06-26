#include "message_queue.h"

bool MessageQueue::push(const char* topic, const char* payload, MessagePriority priority) {
    if (count >= QUEUE_CAPACITY) {
        // Si hay espacio solo si el mensaje es de alta prioridad
        if (priority != MessagePriority::HIGH) return; // descartar baja prioridad

        // Buscar y eliminar un mensaje de baja prioridad para hacer hueco
        int index = head;
        bool found = false;
        for (int i = 0; i < count; i++) {
            if (buffer[index].priority == MessagePriority::LOW) {
                // Mover todos los elementos posteriores una posición hacia atrás
                for (int j = index; j != tail; j = (j + 1) % QUEUE_CAPACITY) {
                    int next = (j + 1) % QUEUE_CAPACITY;
                    buffer[j] = buffer[next];
                }
                tail = (tail - 1 + QUEUE_CAPACITY) % QUEUE_CAPACITY;
                count--;
                found = true;
                break;
            }
            index = (index + 1) % QUEUE_CAPACITY;
        }
        if (!found) return; // todos son alta prioridad, descartar el nuevo
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