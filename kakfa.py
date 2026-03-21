import base64
import json
import logging
import os
import time
from typing import Dict, Any, Optional

from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError, NoBrokersAvailable

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("HiveBus")

KAFKA_SERVER = os.getenv("KAFKA_SERVER", "localhost:9092")
ARTIFACT_TOPIC = "hivemind-artifacts"
RECOVERY_DIR = "received_artifacts"

class KafkaBus:
    """
    High-performance Producer for the HiveMind Swarm.
    Used by Agents to broadcast artifacts/status.
    """
    def __init__(self, server: str = KAFKA_SERVER):
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=server,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                acks='all',         
                retries=5,            
                linger_ms=10          
            )
            logger.info(f"Bus Producer linked to {server}")
        except NoBrokersAvailable:
            logger.error(f"FATAL: Could not find Kafka at {server}")
            raise

    def publish_artifact(self, agent_id: str, file_path: str):
        """Encodes a file and streams it to the topic."""
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return

        try:
            with open(file_path, "rb") as f:
                payload = base64.b64encode(f.read()).decode("utf-8")

            msg = {
                "agent_id": agent_id,
                "filename": os.path.basename(file_path),
                "payload": payload,
                "timestamp": time.time()
            }

            self.producer.send(ARTIFACT_TOPIC, key=agent_id.encode(), value=msg)
            self.producer.flush()
            logger.info(f"Artifact {msg['filename']} broadcasted by {agent_id}")
        except Exception as e:
            logger.error(f"Failed to publish: {e}")

    def shutdown(self):
        self.producer.close()


class ArtifactConsumer:
    """
    Background Listener for the HiveMind Orchestrator.
    Recovers files sent by agents in the field.
    """
    def __init__(self, server: str = KAFKA_SERVER, group_id: str = "hive-monitor"):
        os.makedirs(RECOVERY_DIR, exist_ok=True)
        try:
            self.consumer = KafkaConsumer(
                ARTIFACT_TOPIC,
                bootstrap_servers=server,
                group_id=group_id,
                auto_offset_reset='earliest',
                value_deserializer=lambda x: json.loads(x.decode('utf-8'))
            )
            logger.info(f"Consumer listening on {ARTIFACT_TOPIC}")
        except Exception as e:
            logger.error(f"Consumer Init Failed: {e}")
            raise

    def listen(self):
        """Blocking loop to process incoming messages."""
        for message in self.consumer:
            data = message.value
            try:
               
                save_path = os.path.join(RECOVERY_DIR, f"rec_{data['agent_id']}_{data['filename']}")
                with open(save_path, "wb") as f:
                    f.write(base64.b64decode(data['payload']))
                
                logger.info(f"RECOVERED: {save_path} (from Agent {data['agent_id']})")
            except Exception as e:
                logger.error(f"Processing Error: {e}")
