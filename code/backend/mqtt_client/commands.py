import json
import paho.mqtt.client as mqtt
from core.config import MQTT_BROKER, MQTT_PORT

client = mqtt.Client()

def publish_command(topic: str, payload: dict | None = None) -> bool:
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)

        message = json.dumps(payload or {})
        result = client.publish(topic, message)

        client.disconnect()
        return result.rc == mqtt.MQTT_ERR_SUCCESS
    except Exception as e:
        print("Error publicando comando MQTT:", e)
        return False