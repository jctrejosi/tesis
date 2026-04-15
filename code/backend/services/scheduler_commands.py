from mqtt_client.commands import publish_command
from core.config import (
    MQTT_TOPIC_SCHEDULER_CONFIG,
    MQTT_TOPIC_SCHEDULER_SYNC
)


def update_scheduler_config(config: dict) -> bool:
    return publish_command(
        MQTT_TOPIC_SCHEDULER_CONFIG,
        config
    )


def trigger_global_sync() -> bool:
    return publish_command(
        MQTT_TOPIC_SCHEDULER_SYNC,
        {}
    )