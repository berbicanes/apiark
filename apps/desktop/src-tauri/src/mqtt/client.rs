use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use rumqttc::{AsyncClient, Event, MqttOptions, Packet, QoS};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MqttConnectParams {
    pub broker_url: String,
    pub port: u16,
    pub client_id: String,
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default = "default_keep_alive")]
    pub keep_alive_secs: u64,
}

fn default_keep_alive() -> u64 {
    30
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MqttMessage {
    pub topic: String,
    pub payload: String,
    pub qos: u8,
    pub retain: bool,
    pub timestamp: String,
}

struct MqttConnection {
    client: AsyncClient,
    shutdown: tokio::sync::oneshot::Sender<()>,
}

pub struct MqttManager {
    connections: Mutex<HashMap<String, MqttConnection>>,
}

impl MqttManager {
    pub fn new() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
        }
    }

    pub async fn connect(
        &self,
        connection_id: &str,
        params: MqttConnectParams,
        app: AppHandle,
    ) -> Result<(), String> {
        // Disconnect existing if any
        {
            let conn = self.connections.lock().unwrap().remove(connection_id);
            if let Some(conn) = conn {
                let _ = conn.shutdown.send(());
                // Don't await disconnect here to avoid holding lock
            }
        }

        let mut options = MqttOptions::new(&params.client_id, &params.broker_url, params.port);
        options.set_keep_alive(Duration::from_secs(params.keep_alive_secs));

        if let (Some(user), Some(pass)) = (&params.username, &params.password) {
            options.set_credentials(user, pass);
        }

        let (client, mut eventloop) = AsyncClient::new(options, 10);
        let (tx, mut rx) = tokio::sync::oneshot::channel::<()>();

        let conn_id = connection_id.to_string();
        let app_clone = app.clone();

        // Spawn event loop
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = &mut rx => {
                        break;
                    }
                    event = eventloop.poll() => {
                        match event {
                            Ok(Event::Incoming(Packet::Publish(publish))) => {
                                let msg = MqttMessage {
                                    topic: publish.topic.clone(),
                                    payload: String::from_utf8_lossy(&publish.payload).to_string(),
                                    qos: publish.qos as u8,
                                    retain: publish.retain,
                                    timestamp: chrono::Utc::now().to_rfc3339(),
                                };
                                let _ = app_clone.emit(
                                    &format!("mqtt:message:{conn_id}"),
                                    msg,
                                );
                            }
                            Ok(Event::Incoming(Packet::ConnAck(_))) => {
                                let _ = app_clone.emit(
                                    &format!("mqtt:connected:{conn_id}"),
                                    (),
                                );
                            }
                            Err(e) => {
                                let _ = app_clone.emit(
                                    &format!("mqtt:error:{conn_id}"),
                                    e.to_string(),
                                );
                                break;
                            }
                            _ => {}
                        }
                    }
                }
            }
        });

        self.connections.lock().unwrap().insert(
            connection_id.to_string(),
            MqttConnection {
                client,
                shutdown: tx,
            },
        );

        Ok(())
    }

    pub async fn subscribe(&self, connection_id: &str, topic: &str, qos: u8) -> Result<(), String> {
        let client = {
            let connections = self.connections.lock().unwrap();
            let conn = connections.get(connection_id).ok_or("Not connected")?;
            conn.client.clone()
        };

        let q = match qos {
            0 => QoS::AtMostOnce,
            1 => QoS::AtLeastOnce,
            _ => QoS::ExactlyOnce,
        };

        client
            .subscribe(topic, q)
            .await
            .map_err(|e| format!("Subscribe failed: {e}"))?;

        Ok(())
    }

    pub async fn publish(
        &self,
        connection_id: &str,
        topic: &str,
        payload: &str,
        qos: u8,
        retain: bool,
    ) -> Result<(), String> {
        let client = {
            let connections = self.connections.lock().unwrap();
            let conn = connections.get(connection_id).ok_or("Not connected")?;
            conn.client.clone()
        };

        let q = match qos {
            0 => QoS::AtMostOnce,
            1 => QoS::AtLeastOnce,
            _ => QoS::ExactlyOnce,
        };

        client
            .publish(topic, q, retain, payload.as_bytes())
            .await
            .map_err(|e| format!("Publish failed: {e}"))?;

        Ok(())
    }

    pub async fn disconnect(&self, connection_id: &str) -> Result<(), String> {
        let conn = { self.connections.lock().unwrap().remove(connection_id) };
        if let Some(conn) = conn {
            let _ = conn.shutdown.send(());
            let _ = conn.client.disconnect().await;
        }
        Ok(())
    }
}
