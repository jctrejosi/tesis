from dotenv import load_dotenv
import os

load_dotenv()

MQTT_BROKER = os.getenv("MQTT_BROKER", "127.0.0.1")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

MQTT_TOPIC_BME680 = os.getenv("MQTT_TOPIC_BME680", "growbox/bme680")
MQTT_TOPIC_BME680_CONFIG = os.getenv("MQTT_TOPIC_BME680_CONFIG", "growbox/bme680/config")
MQTT_TOPIC_BME680_READ = os.getenv("MQTT_TOPIC_BME680_READ", "growbox/bme680/read")