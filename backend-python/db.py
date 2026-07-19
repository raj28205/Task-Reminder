"""
Shared MySQL connection — points at the SAME database XAMPP/PHP uses.
"""

import mysql.connector
from config import DB_CONFIG


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)
