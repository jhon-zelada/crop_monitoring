import time
import requests
import os

API_BASE = os.environ.get('API_BASE','http://localhost:8000')
DEVICE_TOKEN = os.environ.get('DEVICE_TOKEN','devicetoken-example')

# Send one telemetry
telemetry = {
    'device_id': '11111111-1111-1111-1111-111111111111',
    'message_id': 'msg-002',
    'timestamp': '2025-01-01T13:00:00Z',
    'measurements': {
        'temperature_c': 28.0,
        'relative_humidity_pct': 62.0,
        'solar_radiance_w_m2': 850.0,
        'wind_speed_m_s': 12.3,
        'wind_direction_deg': 160.0,
        'battery_v': 3.8
    }
}

# Headers should include the token as 'X-Device-Token'
headers = {
    'Authorization': f'Bearer {DEVICE_TOKEN}',  # Optionally, you can include Authorization header.
    'X-Device-Token': DEVICE_TOKEN  # The device token goes here as required by the backend
}

# Sending the POST request with telemetry data
r = requests.post(f'{API_BASE}/api/v1/telemetry', json=telemetry, headers=headers)

print('telemetry:', r.status_code, r.text)

