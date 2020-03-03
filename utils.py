from datetime import datetime
import logging
import requests
import json
import os


FORMAT = '%(asctime)-15s %(levelname)s %(message)s'
formatter = logging.Formatter(FORMAT)
# Create handlers
c_handler = logging.StreamHandler()
f_handler = logging.FileHandler('utils.log')

# Create formatters and add it to handlers
c_handler.setFormatter(formatter)
f_handler.setFormatter(formatter)

logging.basicConfig(format=FORMAT, handlers=[c_handler, f_handler])
logger = logging.getLogger('utils')


def to_file(file_name, text):
    try:
        os.remove(file_name)
    except FileNotFoundError as e:
        pass

    if isinstance(text, str):
        mode = 'wt'
    else:
        mode = 'wb'
    with open(file_name, mode) as f:
        try:
            f.write(text)
        finally:
            f.close()


def txt_from_file(file_name):
    with open(file_name, 'r') as f:
        return f.read()


def json_from_file(file_name, err_msg=None):
    data = None
    with open(file_name, 'rb') as f:
        data = json.load(f)
    if not data:
        raise Exception(err_msg if err_msg else "No data loaded.")
    return data