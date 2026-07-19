from dotenv import load_dotenv
load_dotenv()
from db import get_connection

conn = get_connection()
cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT * FROM geofence_status WHERE user_id=2 AND geofence_id=7")
print(cursor.fetchall())
cursor.close()
conn.close()