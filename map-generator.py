import pymongo, uuid, json, time, logging
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
    return int(s_price.replace('€', '').replace(',', ''))


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
            for address_geodata in list(ss_ads.geodata.find({'address_lv': a})):
                if 'geodata' in address_geodata and address_geodata['geodata']:
                    logger.debug("Found geodata for: %s", a)
                    id = str(uuid.uuid4()).replace('-', '_')
                    marker = address_geodata['geodata'][0]['geometry']['location']
                    ads = list(ss_ads.ads.find({'kind': 'ad', "address_lv": a}))
                    if ads:
                        for i in ads:
                            i['date'] = i['date'].strftime("%H:%M %d.%m.%Y")
                            if 'rooms' not in i:
                                i['rooms'] = '-'
                            prices = list(ss_ads.ads.find({'$and': [{'kind': 'old_price'}, {'ad_id': i['_id']}]}).sort('date', pymongo.DESCENDING))
                            for p in prices:
                                del p['_id']
                                del p['ad_id']
                                p['date'] = p['date'].strftime("%H:%M %d.%m.%Y")
                                p['extracted_price'] = extract_price(p['price'])
                            i['prices'] = prices
                            i['arrow'] = 1
                            current_price = extract_price(i['price'])
                            i['current_price'] = current_price
                            if prices and len(prices)>0:
                                last_old_price = extract_price(prices[0]['price'])
                                if last_old_price < current_price:
                                    i['arrow'] = 0
                            del i['_id']
                            if 'outdated' in i:
                                del i['url']
                            else:
                                i['url'] = '/'.join([config['sscom.url'], 'msg', 'ru', i['url']])
                        header = a.encode('ascii', 'xmlcharrefreplace').decode('cp1251')
                        if len(ads) > 1:
                            marker['label'] = str(len(ads))
                        marker['title'] = a
                        marker['cnt'] = ads
                        type = 'flat'
                        if all(z['type'] in ['Ч. дом'] for z in ads):
                            type = 'house'
                        marker['type'] = type
                        replacement.append(json.dumps(marker))
                        logger.debug("Adding marker: %s, title: %s, label %s, header: %s", a, a, str(len(ads)), header)
                else:
                    logger.debug("No geodata for:    %s", a)

        logger.info("Exporting to file: %s", config['map.path'])
        to_file(config['map.path'], "".join(['[',','.join(replacement),']']))

    if 'restart' in config and config['restart'] > 0:
        logger.info("Waiting %s seconds.", config['restart'])
        time.sleep(config['restart'])
    else:
        exit()