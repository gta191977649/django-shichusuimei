"""V3 personalized five-element strength, composition, and trend calculations."""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from functools import lru_cache
import math
import contextlib
import io

import numpy as np
from lunar_python import Solar

from suimei.constants.five_element import DAY_EFFECT, ELEMENTS, HIDDEN_STEMS, MONTH_EFFECT, MONTH_MATRIX, STEM_ELEMENT, YEAR_EFFECT
from suimei.meishiki import Meishi


def _normalize(values):
    total = sum(values.values())
    return {element: values[element] / total * 100 for element in ELEMENTS}


def _summary(energy):
    entropy = _entropy(energy)
    dominant = max(ELEMENTS, key=energy.__getitem__)
    return entropy / math.log(5) * 100, dominant, energy[dominant]


def _entropy(energy):
    return -sum((energy[e] / 100) * math.log(energy[e] / 100) for e in ELEMENTS if energy[e])


def _imbalance(energy):
    return math.sqrt(sum((energy[e] - 20) ** 2 for e in ELEMENTS) / 5) / 40 * 100


def pillar_to_vector(stem, branch):
    vector = {element: 0.0 for element in ELEMENTS}
    vector[STEM_ELEMENT[stem]] += 1.0
    for hidden_stem, weight in HIDDEN_STEMS[branch].items():
        vector[STEM_ELEMENT[hidden_stem]] += weight
    return vector


def _feature(day_of_year):
    angle = 2 * math.pi * day_of_year / 365
    return [1, math.sin(angle), math.cos(angle), math.sin(2 * angle), math.cos(2 * angle)]


@lru_cache(maxsize=1)
def _seasonal_coefficients():
    anchor_days = [date(2025, month, 15).timetuple().tm_yday for month in range(1, 13)]
    design = np.array([_feature(day) for day in anchor_days])
    return {element: np.linalg.lstsq(design, np.array([MONTH_MATRIX[month][element] for month in range(1, 13)]), rcond=None)[0] for element in ELEMENTS}


def seasonal_month_vector(value):
    """Second-order Fourier fit of Gregorian-month anchors; continuous at year boundaries."""
    feature = np.array(_feature(value.timetuple().tm_yday))
    coefficients = _seasonal_coefficients()
    return {element: float(feature @ coefficients[element]) for element in ELEMENTS}


def _relative(vector, baseline):
    return {element: vector[element] / baseline[element] - 1 for element in ELEMENTS}


@lru_cache(maxsize=1)
def _seasonal_baseline():
    coefficients = _seasonal_coefficients()
    return {element: float(coefficients[element][0]) for element in ELEMENTS}


@lru_cache(maxsize=4096)
def _pillars_for_date(value):
    eight_char = Solar.fromYmd(value.year, value.month, value.day).getLunar().getEightChar()
    return eight_char.getYearGan(), eight_char.getYearZhi(), eight_char.getDayGan(), eight_char.getDayZhi()


def calculate_temporal_energy(value):
    year_gan, year_zhi, day_gan, day_zhi = _pillars_for_date(value)
    year_vector, daily_vector = pillar_to_vector(year_gan, year_zhi), pillar_to_vector(day_gan, day_zhi)
    seasonal_vector = seasonal_month_vector(value)
    year_deviation = _relative(year_vector, {e: sum(year_vector.values()) / 5 for e in ELEMENTS})
    seasonal_deviation = _relative(seasonal_vector, _seasonal_baseline())
    daily_deviation = _relative(daily_vector, {e: sum(daily_vector.values()) / 5 for e in ELEMENTS})
    temporal_strength = {e: math.exp(YEAR_EFFECT * year_deviation[e] + MONTH_EFFECT * seasonal_deviation[e] + DAY_EFFECT * daily_deviation[e]) for e in ELEMENTS}
    energy = _normalize(temporal_strength)
    balance, dominant, strength = _summary(energy)
    return {"date": value.isoformat(), "month": value.month, "flowYearPillar": f"{year_gan}{year_zhi}", "flowDayPillar": f"{day_gan}{day_zhi}", "energy": energy, "temporalStrength": temporal_strength, "seasonalVector": seasonal_vector, "dailyVector": daily_vector, "yearVector": year_vector, "balanceIndex": balance, "imbalanceIndex": _imbalance(energy), "dominantElement": dominant, "dominanceStrength": strength}


def _element_ten_god_relations(day_stem):
    order = list(ELEMENTS); index = order.index(STEM_ELEMENT[day_stem])
    return {order[index]: "比劫", order[(index + 1) % 5]: "食傷", order[(index + 2) % 5]: "財", order[(index + 3) % 5]: "官殺", order[(index + 4) % 5]: "印綬"}


@dataclass(frozen=True)
class NatalResult:
    year_pillar: str; month_pillar: str; day_pillar: str; hour_pillar: str; day_master: str
    energy: dict; entropy: float; balance_index: float; dominant_element: str; dominance_strength: float; ten_god_relations: dict


@lru_cache(maxsize=1024)
def _calculate_natal_energy_cached(year, month, day, hour, minute):
    # Reuse the project's original natal ``_build_five_element_energy`` model exactly.
    # Its gender argument does not affect the raw five-element-energy calculation.
    with contextlib.redirect_stdout(io.StringIO()):
        meishi = Meishi(datetime(year, month, day, hour, minute), gender=1)
    raw = meishi.element_energy["energy"]
    energy = _normalize({"wood": raw["木"], "fire": raw["火"], "earth": raw["土"], "metal": raw["金"], "water": raw["水"]})
    balance, dominant, strength = _summary(energy)
    pillars = {"year": (meishi.tenkan[0], meishi.chishi[0]), "month": (meishi.tenkan[1], meishi.chishi[1]), "day": (meishi.tenkan[2], meishi.chishi[2]), "hour": (meishi.tenkan[3], meishi.chishi[3])}
    return NatalResult(**{f"{name}_pillar": "".join(pillar) for name, pillar in pillars.items()}, day_master=meishi.higen, energy=energy, entropy=_entropy(energy), balance_index=balance, dominant_element=dominant, dominance_strength=strength, ten_god_relations=_element_ten_god_relations(meishi.higen))


def calculate_natal_energy(birth_datetime):
    return _calculate_natal_energy_cached(birth_datetime.year, birth_datetime.month, birth_datetime.day, birth_datetime.hour, birth_datetime.minute)


def calculate_personalized_energy(natal, value):
    temporal = calculate_temporal_energy(value)
    strength = {e: natal.energy[e] * temporal["temporalStrength"][e] for e in ELEMENTS}
    energy = _normalize(strength); balance, dominant, dominance_strength = _summary(energy)
    trend = {e: (strength[e] / natal.energy[e] - 1) * 100 for e in ELEMENTS}
    return {"date": temporal["date"], "month": temporal["month"], "flowYearPillar": temporal["flowYearPillar"], "flowDayPillar": temporal["flowDayPillar"], "temporal": temporal["energy"], "temporalStrength": temporal["temporalStrength"], "seasonalVector": temporal["seasonalVector"], "dailyVector": temporal["dailyVector"], "yearVector": temporal["yearVector"], "strength": strength, "energy": energy, "trend": trend, "deltaFromNatal": {e: energy[e] - natal.energy[e] for e in ELEMENTS}, "balanceIndex": balance, "imbalanceIndex": _imbalance(energy), "dominantElement": dominant, "dominanceStrength": dominance_strength}


def _ema(points, source_field, output_field, period):
    alpha, current = 2 / (period + 1), None
    for point in points:
        source = point[source_field]
        current = source.copy() if current is None else {e: alpha * source[e] + (1 - alpha) * current[e] for e in ELEMENTS}
        point[output_field] = current


def calculate_personalized_range(natal, start_date, end_date):
    points = []; current = start_date
    while current <= end_date:
        points.append(calculate_personalized_energy(natal, current)); current += timedelta(days=1)
    for period in (7, 30):
        _ema(points, "energy", f"ma{period}", period)
        _ema(points, "trend", f"trendEma{period}", period)
        _ema(points, "temporal", f"temporalEma{period}", period)
    return points


def calculate_daily_energy(value):
    temporal = calculate_temporal_energy(value)
    return {**temporal, "yearPillar": temporal["flowYearPillar"], "dayPillar": temporal["flowDayPillar"]}


def calculate_energy_range(start_date, end_date):
    points = []; current = start_date
    while current <= end_date:
        points.append(calculate_daily_energy(current)); current += timedelta(days=1)
    return points
