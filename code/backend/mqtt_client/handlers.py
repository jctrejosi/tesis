import json
from services.bme680 import update_bme680_data

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    data = json.loads(payload)

    update_bme680_data(data)

    print("BME680 recibido:", data)