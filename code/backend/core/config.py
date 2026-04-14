from dotenv import load_dotenv
import os

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "192.168.1.100")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC_BME680 = os.getenv("MQTT_TOPIC_BME680", "growbox/bme680")