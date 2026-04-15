import json
from services.bme680 import update_bme680_data

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode()
        data = json.loads(payload)
        update_bme680_data(data)
        print("BME680 recibido:", data)
    except Exception as e:
        print("Error procesando mensaje MQTT:", e)