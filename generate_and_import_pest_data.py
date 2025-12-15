import json
import random
import sqlite3
from faker import Faker
from datetime import datetime, timedelta
import os

# 初始化伪造数据工具
fake = Faker('zh_CN')

# 范围：3亩地，中心点
CENTER_LAT = 37.9568
CENTER_LNG = 112.4712
LAT_RANGE = (CENTER_LAT - 0.0002, CENTER_LAT + 0.0002)
LNG_RANGE = (CENTER_LNG - 0.00025, CENTER_LNG + 0.00025)

# 指定的玉米病虫害种类
PEST_TYPES = [
    {"class": "Blight", "name": "玉米大斑病"},
    {"class": "brown_spot", "name": "玉米褐斑病"},
    {"class": "corn_rust", "name": "玉米锈病"},
    {"class": "corn_smut", "name": "玉米黑粉病"},
    {"class": "downy_mildew", "name": "玉米霜霉病"},
    {"class": "grey_leaf_spot", "name": "玉米灰斑病"},
    {"class": "maize-streak-disease", "name": "玉米条斑病"},
    {"class": "fall-armyworm-larva", "name": "草地贪夜蛾幼虫"},
    {"class": "yellow-stem-borer", "name": "黄茎螟成虫"},
    {"class": "yellow-stem-borer-larva", "name": "黄茎螟幼虫"}
]

DB_FILE = "pest_data.db"

# 数据库建表
CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS detections (
    id TEXT PRIMARY KEY,
    timestamp TEXT,
    lat REAL,
    lng REAL,
    class TEXT,
    confidence REAL,
    bbox TEXT,
    area_cm2 REAL,
    severity TEXT,
    image_id TEXT
);
'''

# 清空表
CLEAR_TABLE_SQL = 'DELETE FROM detections;'

SEVERITY_LEVELS = ["mild", "moderate", "severe"]

def generate_detection_data(num_points=50, min_types=3, max_types=4):
    """生成50个点位，每个点3~4种不同病虫害，总数不超过250条"""
    detections = []
    coords = set()
    while len(coords) < num_points:
        lat = round(random.uniform(*LAT_RANGE), 6)
        lng = round(random.uniform(*LNG_RANGE), 6)
        coords.add((lat, lng))
    coords = list(coords)
    for lat, lng in coords:
        pest_types = random.sample(PEST_TYPES, random.randint(min_types, max_types))
        for pest in pest_types:
            detection = {
                "id": fake.uuid4(),
                "timestamp": (datetime.now() - timedelta(minutes=random.randint(0, 120))).isoformat(),
                "lat": lat,
                "lng": lng,
                "class": pest["class"],
                "confidence": round(random.uniform(0.7, 0.95), 2),
                "bbox": json.dumps([
                    random.randint(0, 5000),
                    random.randint(0, 3000),
                    random.randint(100, 5472),
                    random.randint(100, 3648)
                ]),
                "area_cm2": round(random.uniform(10, 500), 1),
                "severity": random.choice(SEVERITY_LEVELS),
                "image_id": f"DJI_{random.randint(1000, 9999)}.jpg"
            }
            detections.append(detection)
    # 限制总数不超过250条
    if len(detections) > 250:
        detections = detections[:250]
    return detections

def import_to_db(detections, db_file=DB_FILE):
    conn = sqlite3.connect(db_file)
    c = conn.cursor()
    c.execute(CREATE_TABLE_SQL)
    c.execute(CLEAR_TABLE_SQL)
    insert_sql = '''
    INSERT OR REPLACE INTO detections
    (id, timestamp, lat, lng, class, confidence, bbox, area_cm2, severity, image_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    '''
    data_to_insert = [
        (
            d["id"], d["timestamp"], d["lat"], d["lng"], d["class"],
            d["confidence"], d["bbox"], d["area_cm2"], d["severity"], d["image_id"]
        ) for d in detections
    ]
    c.executemany(insert_sql, data_to_insert)
    conn.commit()
    conn.close()
    print(f"已导入 {len(detections)} 条数据到数据库 {db_file}（覆盖原有数据）")

if __name__ == "__main__":
    print(f"正在生成50个点位，每个点3~4种病虫害，总数不超过250条...")
    detections = generate_detection_data(num_points=50, min_types=3, max_types=4)
    import_to_db(detections)
    print("全部完成！您可以用 SQLite 工具或 Python 查询 pest_data.db 数据库。")
    this.amap.setFitView(); 