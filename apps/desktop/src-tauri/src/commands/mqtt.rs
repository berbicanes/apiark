use crate::mqtt::client::{MqttConnectParams, MqttManager};

#[tauri::command]
pub async fn mqtt_connect(
    connection_id: String,
    params: MqttConnectParams,
    app: tauri::AppHandle,
    state: tauri::State<'_, MqttManager>,
) -> Result<(), String> {
    state.connect(&connection_id, params, app).await
}

#[tauri::command]
pub async fn mqtt_subscribe(
    connection_id: String,
    topic: String,
    qos: u8,
    state: tauri::State<'_, MqttManager>,
) -> Result<(), String> {
    state.subscribe(&connection_id, &topic, qos).await
}

#[tauri::command]
pub async fn mqtt_publish(
    connection_id: String,
    topic: String,
    payload: String,
    qos: u8,
    retain: bool,
    state: tauri::State<'_, MqttManager>,
) -> Result<(), String> {
    state
        .publish(&connection_id, &topic, &payload, qos, retain)
        .await
}

#[tauri::command]
pub async fn mqtt_disconnect(
    connection_id: String,
    state: tauri::State<'_, MqttManager>,
) -> Result<(), String> {
    state.disconnect(&connection_id).await
}
