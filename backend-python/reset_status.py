from dotenv import load_dotenv
load_dotenv()
from db import get_connection

conn = get_connection()
cursor = conn.cursor()
cursor.execute("UPDATE geofence_status SET status='outside' WHERE user_id=2 AND geofence_id=7")
conn.commit()
print("Rows updated:", cursor.rowcount)
cursor.close()
conn.close()