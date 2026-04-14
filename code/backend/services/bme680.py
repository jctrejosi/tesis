from models.bme680_data import bme680_latest_data

def update_bme680_data(data: dict):
    bme680_latest_data.update(data)

def get_bme680_data():
    return bme680_latest_data