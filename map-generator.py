import json
import logging
import time
import uuid

import pymongo

from utils import json_from_file, to_file

ss_config = 'config.json'
config = {}

try:
    config = json_from_file(ss_config, "Can't open ss-config file.")
except RuntimeError as e:
    print(e)
    exit()

formatter = logging.Formatter(config['logging.format'])
# Create handlers
c_handler = logging.StreamHandler()
f_handler = logging.FileHandler(config['logging.file'])

# Create formatters and add it to handlers
c_handler.setFormatter(formatter)
f_handler.setFormatter(formatter)

logging_level = config["logging.level"] if 'logging.level' in config else 20
print("Logging level", logging_level)
print("Logging format", config["logging.format"])
print("Logging file \"%s\"" % config['logging.file'])

logging.basicConfig(format=config["logging.format"], level=logging_level, handlers=[c_handler, f_handler])
logger = logging.getLogger(config["logging.name"])
logger.setLevel(logging_level)


def extract_price(s_price: str) -> int:
    if not s_price:
        return 0
    stripped = s_price.replace('€', '').replace(',', '').strip()
    return int() if stripped else 0


def build_cnt(date, m2, prices, arrow, pm2, lvl, url, c_p, rooms, price, type):
    return {'date': date, 'm2': m2, 'prices': prices, 'arrow': arrow, 'pm2': pm2, 'lvl': lvl, 'url': url, 'c_p': c_p, 'rooms': rooms, 'price': price, 'type': type}


def build_marker(a, ads, marker):
    type = 'flat'
    if all(z['type'] in ['Ч. дом'] for z in ads):
        type = 'house'

    cnts = []
    for i in ads:
        rooms = '-'
        if 'rooms' in i and '-' not in i['rooms']:
            rooms = int(i['rooms'])
        prices = list(ss_ads.ads.find({'$and': [{'kind': 'old_price'}, {'ad_id': i['_id']}]}).sort('date', pymongo.DESCENDING))
        for p in prices:
            del p['_id']
            del p['ad_id']
            p['date'] = p['date'].strftime("%H:%M %d.%m.%Y")
            p['extracted_price'] = extract_price(p['price'])

        current_price = extract_price(i['price'])

        arrow = 1
        if prices and len(prices) > 0:
            last_old_price = extract_price(prices[0]['price'])
            if last_old_price < current_price:
                arrow = 0

        url = ''
        if 'outdated' in i and i['outdated']:
            pass
        else:
            url = i['url'].replace('real-estate/', '')
        cnts.append(build_cnt(i['date'].strftime("%H:%M %d.%m.%Y"), int(i['m2']), prices, arrow, i['price_m2'], i['level'], url, current_price, rooms, i['price'], i['type']))

    return {'title': a, 'cnt': cnts, 'type': type, 'lat': marker['lat'], 'lng': marker['lng']}


logger.info("Starting map generator.")
while True:
    myclient = pymongo.MongoClient(config['db.url.local'])
    logger.debug("Connected to database.")

    with myclient:
        ss_ads = myclient.ss_ads

        replacement = []

        addresses = list(ss_ads.ads.distinct("address_lv", {}))
        logger.debug("Receive list of addresses: %s", addresses)
        for a in addresses:
            for address_geodata in list(ss_ads.geodata.find({'address': a})):
                if 'geodata' in address_geodata and address_geodata['geodata']:
                    logger.debug("Found geodata for: %s", a)
                    id = str(uuid.uuid4()).replace('-', '_')
                    marker = address_geodata['geodata'][0]['geometry']['location']
                    ads = list(ss_ads.ads.find({'kind': 'ad', "address_lv": a}))
                    if ads:
                        replacement.append(json.dumps(build_marker(a, ads, marker)))
                        logger.debug("Adding marker: %s, title: %s", a, a)
                else:
                    logger.debug("No geodata for:    %s", a)

        logger.info("Exporting to file: %s", config['map.path'])
        to_file(config['map.path'], "".join(['[',','.join(replacement),']']))

    if 'restart' in config and config['restart'] > 0:
        logger.info("Waiting %s seconds.", config['restart'])
        time.sleep(config['restart'])
    else:
        exit()