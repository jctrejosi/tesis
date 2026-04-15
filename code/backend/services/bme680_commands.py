from mqtt_client.commands import publish_command
from core.config import MQTT_TOPIC_BME680_CONFIG, MQTT_TOPIC_BME680_READ

def request_bme680_read() -> bool:
    return publish_command(MQTT_TOPIC_BME680_READ, {})

def update_bme680_config(config: dict) -> bool:
    return publish_command(MQTT_TOPIC_BME680_CONFIG, config)