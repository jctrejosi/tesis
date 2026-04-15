import paho.mqtt.client as mqtt
from core.config import MQTT_BROKER, MQTT_PORT
from mqtt_client.handlers import on_message, on_connect

client = mqtt.Client()

def start_mqtt():
    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()