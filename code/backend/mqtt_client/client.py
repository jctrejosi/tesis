import paho.mqtt.client as mqtt
from core.config import MQTT_BROKER, MQTT_PORT, MQTT_TOPIC_BME680
from mqtt_client.handlers import on_message

client = mqtt.Client()

def start_mqtt():
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.subscribe(MQTT_TOPIC_BME680)
    client.loop_start()