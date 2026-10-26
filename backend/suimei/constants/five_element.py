"""Configurable inputs for the Gregorian-month five-element energy model."""

ELEMENTS = ("wood", "fire", "earth", "metal", "water")

STEM_ELEMENT = {
    "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire", "戊": "earth",
    "己": "earth", "庚": "metal", "辛": "metal", "壬": "water", "癸": "water",
}

HIDDEN_STEMS = {
    "子": {"癸": 1.00}, "丑": {"己": 0.60, "癸": 0.30, "辛": 0.10},
    "寅": {"甲": 0.60, "丙": 0.30, "戊": 0.10}, "卯": {"乙": 1.00},
    "辰": {"戊": 0.60, "乙": 0.30, "癸": 0.10}, "巳": {"丙": 0.60, "戊": 0.30, "庚": 0.10},
    "午": {"丁": 0.70, "己": 0.30}, "未": {"己": 0.60, "丁": 0.30, "乙": 0.10},
    "申": {"庚": 0.60, "壬": 0.30, "戊": 0.10}, "酉": {"辛": 1.00},
    "戌": {"戊": 0.60, "辛": 0.30, "丁": 0.10}, "亥": {"壬": 0.70, "甲": 0.30},
}

# This is a configurable quantitative-model parameter, not a universal BaZi rule.
MONTH_MATRIX = {
    1: {"wood": 1.30, "fire": 0.55, "earth": 0.75, "metal": 1.00, "water": 1.80},
    2: {"wood": 1.60, "fire": 0.80, "earth": 0.70, "metal": 0.80, "water": 1.40},
    3: {"wood": 1.90, "fire": 1.10, "earth": 0.70, "metal": 0.65, "water": 1.10},
    4: {"wood": 1.55, "fire": 1.35, "earth": 1.00, "metal": 0.70, "water": 0.85},
    5: {"wood": 1.10, "fire": 1.65, "earth": 1.25, "metal": 0.75, "water": 0.65},
    6: {"wood": 0.85, "fire": 1.90, "earth": 1.35, "metal": 0.75, "water": 0.55},
    7: {"wood": 0.80, "fire": 1.55, "earth": 1.55, "metal": 0.95, "water": 0.60},
    8: {"wood": 0.75, "fire": 1.05, "earth": 1.25, "metal": 1.55, "water": 0.90},
    9: {"wood": 0.60, "fire": 0.80, "earth": 1.00, "metal": 1.90, "water": 1.15},
    10: {"wood": 0.70, "fire": 0.80, "earth": 1.35, "metal": 1.60, "water": 1.10},
    11: {"wood": 0.95, "fire": 0.65, "earth": 0.85, "metal": 1.25, "water": 1.70},
    12: {"wood": 1.15, "fire": 0.55, "earth": 0.75, "metal": 1.05, "water": 1.90},
}

YEAR_WEIGHT = 0.20
MONTH_WEIGHT = 0.35
DAY_WEIGHT = 0.45

# Flow is decomposed into a low-frequency seasonal trend plus daily variation.
TREND_YEAR_WEIGHT = 0.30
TREND_MONTH_WEIGHT = 0.70
DAILY_VARIATION_WEIGHT = 0.30
PERSONAL_MODULATION_WEIGHT = 0.40

YEAR_EFFECT = 0.15
MONTH_EFFECT = 0.45
DAY_EFFECT = 0.40

NATAL_WEIGHT = 0.55
FLOW_WEIGHT = 0.45
NATAL_PILLAR_WEIGHTS = {"year": 0.15, "month": 0.30, "day": 0.35, "hour": 0.20}

assert abs(YEAR_WEIGHT + MONTH_WEIGHT + DAY_WEIGHT - 1.0) < 1e-9
assert abs(NATAL_WEIGHT + FLOW_WEIGHT - 1.0) < 1e-9
assert abs(sum(NATAL_PILLAR_WEIGHTS.values()) - 1.0) < 1e-9
assert abs(TREND_YEAR_WEIGHT + TREND_MONTH_WEIGHT - 1.0) < 1e-9
