"""Simple device simulator: sends telemetry and simulates camera uploads.
Run with: python tools/device_simulator.py
"""
import time
import requests
from PIL import Image
from io import BytesIO
import os

API_BASE = os.environ.get('API_BASE','http://localhost:8000')
DEVICE_TOKEN = os.environ.get('DEVICE_TOKEN','devicetoken-example')

headers = {'Authorization': f'Bearer {DEVICE_TOKEN}'}

# send one telemetry
telemetry = {
    'device_id': 'weather-01',
    'message_id': 'msg-001',
    'timestamp': '2025-01-01T12:00:00Z',
    'measurements': {
        'temperature_c': 25.0,
        'relative_humidity_pct': 60.0,
        'solar_radiance_w_m2': 800.0,
        'wind_speed_m_s': 2.3,
        'wind_direction_deg': 180.0,
        'battery_v': 3.8
    }
}

r = requests.post(f'{API_BASE}/api/v1/telemetry', json=telemetry, headers={'token': DEVICE_TOKEN})
print('telemetry:', r.status_code, r.text)

# simulate camera session
start = requests.post(f'{API_BASE}/api/v1/camera/sessions/start', json={'device_id':'cam-raspi-01','operator_id':'op-1'})
print('start session:', start.status_code, start.text)
if start.status_code==200:
    session_id = start.json()['session_id']
    # request one presigned upload
    up = requests.post(f'{API_BASE}/api/v1/images/request-upload', params={'device_id':'cam-raspi-01','frame_index':1})
    print('presign:', up.status_code, up.text)
    if up.status_code==200:
        data = up.json()
        upload_url = data['upload_url']
        s3_key = data['s3_key']
        # create small image
        img = Image.new('RGB', (640,480), color=(73,109,137))
        buf = BytesIO()
        img.save(buf, format='JPEG', quality=70)
        buf.seek(0)
        put = requests.put(upload_url, data=buf.getvalue(), headers={'Content-Type':'image/jpeg'})
        print('put:', put.status_code)
        # notify complete
        complete = requests.post(f'{API_BASE}/api/v1/images/complete', json={'session_id':session_id, 'frame_index':1, 'timestamp':'2025-01-01T12:01:00Z', 's3_key':s3_key})
        print('complete:', complete.status_code, complete.text)