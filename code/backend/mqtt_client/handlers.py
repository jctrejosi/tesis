import json
from core.config import MQTT_TOPIC_BME680
from services.bme680 import update_bme680_data

def on_connect(client, userdata, flags, rc):
    print("MQTT conectado, rc =", rc)
    client.subscribe(MQTT_TOPIC_BME680)
    print("Suscrito a:", MQTT_TOPIC_BME680)

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    print("TOPIC:", msg.topic)
    print("RAW:", payload)

    data = json.loads(payload)
    update_bme680_data(data)

    print("BME680 recibido:", data)