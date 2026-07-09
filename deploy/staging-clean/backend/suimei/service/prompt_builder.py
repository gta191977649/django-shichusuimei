from datetime import datetime
from typing import Any
from django.utils.dateparse import parse_datetime

# 五行对应
def element_type_check(element):
    # 天干五行映射
    heavenly_stems = {
        '甲': '木', '乙': '木',  # 甲乙属木
        '丙': '火', '丁': '火',  # 丙丁属火
        '戊': '土', '己': '土',  # 戊己属土
        '庚': '金', '辛': '金',  # 庚辛属金
        '壬': '水', '癸': '水'  # 壬癸属水
    }

    # 地支五行映射
    earthly_branches = {
        '寅': '木', '卯': '木',  # 寅卯属木
        '巳': '火', '午': '火',  # 巳午属火
        '申': '金', '酉': '金',  # 申酉属金
        '亥': '水', '子': '水',  # 亥子属水
        '辰': '土', '戌': '土', '丑': '土', '未': '土'  # 辰戌丑未属土
    }

    # 合并字典
    element_map = {**heavenly_stems, **earthly_branches}

    # 查找并返回结果
    if element in element_map:
        return element_map[element]
    else:
        return "不明要素"


def element_season_check(element):
    # 地支季节映射
    earthly_branches_season = {
        '寅': '春', '卯': '春', '辰': '春',  # 春季
        '巳': '夏', '午': '夏', '未': '夏',  # 夏季
        '申': '秋', '酉': '秋', '戌': '秋',  # 秋季
        '亥': '冬', '子': '冬', '丑': '冬'  # 冬季
    }

    # 查找并返回结果
    if element in earthly_branches_season:
        return earthly_branches_season[element]
    else:
        return "不是有效的地支"


def tiaohouReference(season):

    # 季节调候映射
    season_tiaohou = {
        '冬': '冬季亥子丑月，需火来解冻暖局，见火为吉。',
        '夏': '夏季巳午未月，需水来降温润局，水运不错。',
        '春': '春秋气候适中，若无显著汗湿或燥热，则无需调候。',
        '秋': '春秋气候适中，若无显著汗湿或燥热，则无需调候。'
    }

    # 查找并返回结果
    if season in season_tiaohou:
        return season_tiaohou[season]
    else:
        return "不是有效的季节"


def format_shishen_output(data, reference):
    """
    格式化输出五行及其对应的十神和数值

    Args:
        data (dict): 五行及其数值的字典
        reference (dict): 五行及其对应十神的字典

    Returns:
        str: 格式化的字符串
    """
    # 按照木、火、土、金、水的顺序排列
    order = ['木', '火', '土', '金', '水']

    # 为每个五行生成格式化字符串
    parts = []
    for element in order:
        if element in data and element in reference:
            value = data[element]
            shishen = reference[element]
            parts.append(f"{element}({shishen}): {value}")

    # 用逗号连接所有部分
    return ", ".join(parts)


def format_shishen_analysis(data_dict):
    output_lines = []

    for shishen, info in data_dict.items():
        # 开始构建输出字符串
        line = f"{shishen}({info['element']}):"

        # 处理透出信息
        if 'touchu' in info and info['touchu']:
            touchu_info = info['touchu']
            line += f" 透出于地支({touchu_info['chishi']})藏干({touchu_info['element']}){touchu_info['tsuhen']}于{touchu_info['qi']}"

        # 处理通根信息
        if 'tonggen' in info and info['tonggen']:
            tonggen_info = info['tonggen']
            if '透出' in line:  # 如果已经有透出信息，加逗号分隔
                line += "，"
            line += f"通根于地支({tonggen_info['chishi']})藏干({tonggen_info['element']}){tonggen_info['tsuhen']}于{tonggen_info['qi']}"

        output_lines.append(line)

    return output_lines


def format_gouka_reference(gouka):
    if not gouka:
        return "未检测到刑沖破害、合与化相关信息。"

    raw_kan = gouka.get("kan", [])
    raw_shi = gouka.get("shi", [])
    resolved = gouka.get("resolved", {})
    summary = resolved.get("summary", [])

    def _render(items):
        rendered = []
        for item in items:
            elements = "".join(str(element) for element in item.get("element", []))
            target = f"→{item['to']}" if item.get("to") else ""
            state = f"({item['state']})" if item.get("state") else ""
            rendered.append(f"{elements}{item.get('type', '-')}{target}{state}")
        return "、".join(rendered) or "无"

    return (
        f"原始检出[天干]：{_render(raw_kan)}\n"
        f"原始检出[地支]：{_render(raw_shi)}\n"
        f"Chart-level裁决：{'；'.join(summary) if summary else '无'}"
    )


def _format_adjustment_reference(adjustments):
    if not adjustments:
        return "无"

    important_types = {"三合局", "三会局", "半合"}
    important_actions = {"化入", "合意"}
    important = [
        item for item in adjustments
        if item.get("type") in important_types
        or item.get("source_type") in important_types
        or item.get("action") in important_actions
    ]
    if not important:
        important = adjustments[:6]

    parts = []
    for item in important[:8]:
        source_type = item.get("source_type") or item.get("type") or "-"
        relation = "".join(str(element) for element in item.get("relation_element", []))
        target = f"→{item.get('to')}" if item.get("to") else ""
        delta = item.get("delta")
        delta_text = f"{delta:+.2f}" if isinstance(delta, (int, float)) else str(delta or "-")
        season = (
            f"、月令factor={item.get('season_factor')}"
            if item.get("season_factor") is not None
            else ""
        )
        parts.append(
            f"{source_type}{relation}{target}/{item.get('action', '-')}:{item.get('element', '-')} {delta_text}{season}"
        )

    return "；".join(parts)


def _format_ratio_percent(value):
    if value is None:
        return "-"
    return f"{value * 100:.2f}%"


def _format_energy_distribution(element_energy):
    if not element_energy:
        return "无"

    energy = element_energy.get("energy", {})
    relation = element_energy.get("relation", {})
    total = sum(float(value) for value in energy.values())
    if not total:
        return "无"

    parts = []
    for element in ["木", "火", "土", "金", "水"]:
        value = float(energy.get(element, 0))
        ratio = value / total
        parts.append(f"{element}({relation.get(element, '-')})={_format_ratio_percent(ratio)}")

    return "、".join(parts)


def _format_shishen_ratio_distribution(element_energy):
    if not element_energy:
        return "无"

    energy = element_energy.get("energy", {})
    relation = element_energy.get("relation", {})
    total = sum(float(value) for value in energy.values())
    if not total:
        return "无"

    parts = []
    for element in ["木", "火", "土", "金", "水"]:
        value = float(energy.get(element, 0))
        ratio = value / total
        parts.append(f"{relation.get(element, '-')}({element})={_format_ratio_percent(ratio)}")

    return "、".join(parts)


def format_shishen_ratio_reference(bazi):
    lines = [
        f"原局：{_format_shishen_ratio_distribution(getattr(bazi, 'element_energy', None))}",
    ]

    adjusted_energy = getattr(bazi, "element_energy_adjusted", None)
    if adjusted_energy:
        lines.append(f"制化補正後参考：{_format_shishen_ratio_distribution(adjusted_energy)}")

    return "\n".join(lines)


def format_shin_type_reference(bazi):
    ratio = getattr(bazi, "shin_type_ratio", {}) or {}
    adjusted_ratio = getattr(bazi, "shin_type_ratio_adjusted", {}) or {}
    adjusted_type = getattr(bazi, "shin_type_adjusted", None)
    adjusted_energy = getattr(bazi, "element_energy_adjusted", None)

    lines = [
        (
            f"原局判定：{getattr(bazi, 'shin_type', '-')}"
            f"（判定基準=同行割合、同行={_format_ratio_percent(ratio.get('same_ratio'))}、"
            f"異行={_format_ratio_percent(ratio.get('different_ratio'))}、"
            f"差分={_format_ratio_percent(ratio.get('delta'))}、中和帯=±5%）"
        ),
        f"原局五行能量：{_format_energy_distribution(getattr(bazi, 'element_energy', None))}",
    ]

    if adjusted_ratio:
        adjustments = adjusted_energy.get("adjustments", []) if adjusted_energy else []
        basis_detail = adjusted_energy.get("basis_detail") if adjusted_energy else None
        season_adjustments = [
            item for item in adjustments
            if item.get("season_factor") is not None
        ]
        basis_note = "反映刑、冲、破、害、干合、支合、暗合、三合局、三会局、半合的裁决结果"
        if basis_detail == "gouka_resolved_tsukirei_tempered":
            basis_note += "，合意与化成（包含三合局、三会局、半合）会按化神的月令系数进行温和调制"
        lines.extend([
            (
                f"制化裁決補正後参考：{adjusted_type or '-'}"
                f"（同行={_format_ratio_percent(adjusted_ratio.get('same_ratio'))}、"
                f"異行={_format_ratio_percent(adjusted_ratio.get('different_ratio'))}、"
                f"差分={_format_ratio_percent(adjusted_ratio.get('delta'))}）"
            ),
            f"補正後五行能量：{_format_energy_distribution(adjusted_energy)}",
            f"补正依据：{basis_note}。补正件数={len(adjustments)}、月令调制件数={len(season_adjustments)}",
            f"制化裁決補正明細：{_format_adjustment_reference(adjustments)}",
        ])
    else:
        lines.append("制化裁決補正後参考：无")

    return "\n".join(lines)


FLOW_RELATION_TYPES = {"干合", "支合", "三合局", "三会局", "半合"}
BLOCK_RELATION_TYPES = {"干沖", "干冲", "支沖", "支冲", "支刑", "自刑"}
GENERATES_ELEMENT = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}
CONTROLS_ELEMENT = {"木": "土", "土": "水", "水": "火", "火": "金", "金": "木"}
PILLAR_LABELS = ["年柱", "月柱", "日柱", "时柱"]


def _safe_junshi(bazi, row_index, index):
    try:
        return bazi.junshi[row_index][index] or "-"
    except (AttributeError, IndexError, TypeError, KeyError):
        return "-"


def _flow_indexes(bazi):
    indexes = [0, 1, 2, 3]
    if _is_birth_time_unknown(bazi):
        indexes = [0, 1, 2]
    return indexes


def _is_adjacent_indexes(indexes):
    if len(indexes) != 2:
        return False
    left, right = sorted(indexes)
    return right - left == 1


def _format_flow_symbol(bazi, row, index):
    if row == "kan":
        symbol = bazi.tenkan[index]
        tsuhen = _safe_junshi(bazi, 0, index)
        row_label = "天干"
    else:
        symbol = bazi.chishi[index]
        tsuhen = _safe_junshi(bazi, 3, index)
        row_label = "地支"
    return f"{PILLAR_LABELS[index]}{row_label}{symbol}{element_type_check(symbol)}({tsuhen})"


def _five_element_flow_relation(left, right):
    left_element = element_type_check(left)
    right_element = element_type_check(right)
    if "不明" in {left_element, right_element}:
        return None
    if left_element == right_element:
        return {"type": "相助", "status": "流通"}
    if GENERATES_ELEMENT.get(left_element) == right_element or GENERATES_ELEMENT.get(right_element) == left_element:
        return {"type": "相生", "status": "流通"}
    if CONTROLS_ELEMENT.get(left_element) == right_element or CONTROLS_ELEMENT.get(right_element) == left_element:
        return {"type": "相克", "status": "阻塞"}
    return None


def format_element_flow_reference(bazi):
    indexes = set(_flow_indexes(bazi))
    gouka = getattr(bazi, "gouka", {}) or {}
    lines = []
    covered = set()

    def add_gouka_relation(item, row):
        relation_indexes = [
            index for index in item.get("index", [])
            if index in indexes
        ]
        if not _is_adjacent_indexes(relation_indexes):
            return

        relation_type = item.get("type", "-")
        if relation_type not in FLOW_RELATION_TYPES and relation_type not in BLOCK_RELATION_TYPES:
            return

        sorted_indexes = sorted(relation_indexes)
        status = "流通" if relation_type in FLOW_RELATION_TYPES else "阻塞"
        target = f"→{item.get('to')}" if item.get("to") else ""
        covered.add((row, sorted_indexes[0], sorted_indexes[1]))
        lines.append(
            f"{_format_flow_symbol(bazi, row, sorted_indexes[0])} × "
            f"{_format_flow_symbol(bazi, row, sorted_indexes[1])}："
            f"{relation_type}{target}（{status}）"
        )

    for item in gouka.get("kan", []):
        add_gouka_relation(item, "kan")
    for item in gouka.get("shi", []):
        add_gouka_relation(item, "shi")

    for index in range(3):
        if index not in indexes or index + 1 not in indexes:
            continue
        for row, values in (("kan", bazi.tenkan), ("shi", bazi.chishi)):
            key = (row, index, index + 1)
            if key in covered:
                continue
            relation = _five_element_flow_relation(values[index], values[index + 1])
            if not relation:
                continue
            lines.append(
                f"{_format_flow_symbol(bazi, row, index)} × "
                f"{_format_flow_symbol(bazi, row, index + 1)}："
                f"{relation['type']}（{relation['status']}）"
            )

    for index in sorted(indexes):
        relation = _five_element_flow_relation(bazi.tenkan[index], bazi.chishi[index])
        if not relation:
            continue
        lines.append(
            f"{PILLAR_LABELS[index]}同柱："
            f"{_format_flow_symbol(bazi, 'kan', index)} × {_format_flow_symbol(bazi, 'shi', index)}："
            f"{relation['type']}（{relation['status']}）"
        )

    note = (
        "判定范围：相邻柱的天干/地支关系，以及同柱天干-地支关系；"
        "合类、冲刑优先于五行生助克。"
    )
    if _is_birth_time_unknown(bazi):
        note += "出生时刻不明，已跳过时柱相关流通。"
    if not lines:
        return f"{note}\n未检测到明显流通/阻塞链路。"

    return (
        f"{note}\n"
        + "；\n".join(lines)
        + "\n使用提示：请把流通信息用于判断命主的思维回路、能量传导方式、优势发挥路径与问题卡点；"
        "流通处看顺手、擅长、自然反应，阻塞处看内耗、矛盾、误判和需要修正的行为模式。"
    )


UNKNOWN_PILLAR_TEXT = "不明"
UNKNOWN_BIRTH_TIME_TEXT = "時刻不明"


def _is_birth_time_unknown(bazi):
    return bool(getattr(bazi, "birth_time_unknown", False))


def _format_birth_label(bazi):
    if _is_birth_time_unknown(bazi):
        return f"{bazi.birthdate.strftime('%Y-%m-%d')} {getattr(bazi, 'birth_time_display', UNKNOWN_BIRTH_TIME_TEXT)}"
    return str(bazi.birthdate)


def _format_pillar_reference_line(bazi, index, label):
    shi_entry = bazi.meisiki["shi"][index]
    return (
        f"{label}:{bazi.tenkan[index]}{element_type_check(bazi.tenkan[index])}({bazi.junshi[0][index]})，"
        f"{bazi.chishi[index]}{element_type_check(bazi.chishi[index])}({bazi.junshi[3][index]}) "
        f"藏干:["
        f"{shi_entry['zoukan'][0]['element']}{element_type_check(shi_entry['zoukan'][0]['element'])}({shi_entry['zoukan'][0]['tsuhen']}),"
        f"{shi_entry['zoukan'][1]['element']}{element_type_check(shi_entry['zoukan'][1]['element'])}({shi_entry['zoukan'][1]['tsuhen']}),"
        f"{shi_entry['zoukan'][2]['element']}{element_type_check(shi_entry['zoukan'][2]['element'])}({shi_entry['zoukan'][2]['tsuhen']})"
        "].\n"
    )


def _format_time_pillar_reference_line(bazi):
    if _is_birth_time_unknown(bazi):
        return "時柱:不明（出生時刻不明，時柱干支・十神・蔵干はすべて不明として扱います）。\n"
    return _format_pillar_reference_line(bazi, 3, "时柱")


ELEMENT_INSIGHT_PILLARS = [
    ("year", "年柱", 0),
    ("month", "月柱", 1),
    ("day", "日柱", 2),
    ("time", "时柱", 3),
]
ELEMENT_INSIGHT_HIDDEN_PARTS = [
    ("hidden_primary", "藏干（本气）", 2),
    ("hidden_middle", "藏干（中气）", 1),
    ("hidden_residual", "藏干（余气）", 0),
]


def build_element_insight_specs(bazi):
    specs = []

    for pillar_key, pillar_label, index in ELEMENT_INSIGHT_PILLARS:
        if pillar_key == "time" and _is_birth_time_unknown(bazi):
            continue

        shi_entry = bazi.meisiki["shi"][index]
        specs.append(
            {
                "key": f"{pillar_key}.stem",
                "pillar": pillar_key,
                "part": "stem",
                "pillarLabel": pillar_label,
                "partLabel": "天干",
                "symbol": bazi.tenkan[index],
                "tsuhen": bazi.junshi[0][index],
            }
        )
        specs.append(
            {
                "key": f"{pillar_key}.branch",
                "pillar": pillar_key,
                "part": "branch",
                "pillarLabel": pillar_label,
                "partLabel": "地支",
                "symbol": bazi.chishi[index],
                "tsuhen": bazi.junshi[3][index],
            }
        )

        for part_key, part_label, zoukan_index in ELEMENT_INSIGHT_HIDDEN_PARTS:
            hidden_stem = shi_entry["zoukan"][zoukan_index]
            hidden_symbol = hidden_stem["element"]
            if not hidden_symbol:
                continue
            specs.append(
                {
                    "key": f"{pillar_key}.{part_key}",
                    "pillar": pillar_key,
                    "part": part_key,
                    "pillarLabel": pillar_label,
                    "partLabel": part_label,
                    "symbol": hidden_symbol,
                    "tsuhen": hidden_stem["tsuhen"],
                }
            )

    return specs


def format_element_insight_reference(bazi):
    lines = []
    for item in build_element_insight_specs(bazi):
        lines.append(
            f"- {item['key']}: {item['pillarLabel']} / {item['partLabel']} / {item['symbol']} / 十神={item['tsuhen']}"
        )
    return "\n".join(lines)


CHAT_STEM_RELATION_TABLES = [
    ("干合", [("甲", "己", "土"), ("乙", "庚", "金"), ("丙", "辛", "水"), ("丁", "壬", "木"), ("戊", "癸", "火")]),
    ("干沖", [("甲", "庚"), ("乙", "辛"), ("丙", "壬"), ("丁", "癸")]),
]

CHAT_BRANCH_RELATION_TABLES = [
    ("支合", [("子", "丑", "土"), ("辰", "酉", "金"), ("申", "巳", "水"), ("寅", "亥", "木"), ("午", "未", "火/土"), ("卯", "戌", "火")]),
    ("半合", [("申", "子", "水"), ("子", "辰", "水"), ("亥", "卯", "木"), ("卯", "未", "木"), ("寅", "午", "火"), ("午", "戌", "火"), ("巳", "酉", "金"), ("酉", "丑", "金")]),
    ("暗合", [("寅", "丑"), ("申", "卯"), ("午", "亥"), ("子", "巳")]),
    ("支沖", [("午", "子"), ("未", "丑"), ("申", "寅"), ("酉", "卯"), ("戌", "辰"), ("亥", "巳")]),
    ("支刑", [("子", "卯"), ("寅", "巳"), ("巳", "申"), ("申", "寅"), ("丑", "戌"), ("戌", "未"), ("未", "丑")]),
    ("自刑", [("辰", "辰"), ("午", "午"), ("酉", "酉"), ("亥", "亥")]),
    ("支破", [("酉", "子"), ("辰", "丑"), ("亥", "寅"), ("午", "卯"), ("申", "巳"), ("未", "戌")]),
    ("支害", [("酉", "戌"), ("申", "亥"), ("未", "子"), ("午", "丑"), ("巳", "寅"), ("辰", "卯")]),
]

CHAT_SANHE_TABLES = [
    ("三合局", ("申", "子", "辰", "水")),
    ("三合局", ("亥", "卯", "未", "木")),
    ("三合局", ("寅", "午", "戌", "火")),
    ("三合局", ("巳", "酉", "丑", "金")),
]

CHAT_SANHUI_TABLES = [
    ("三会局", ("亥", "子", "丑", "水")),
    ("三会局", ("寅", "卯", "辰", "木")),
    ("三会局", ("巳", "午", "未", "火")),
    ("三会局", ("申", "酉", "戌", "金")),
]


def _chat_relation_pair_match(left, right, pair):
    pair_values = pair[:2]
    return tuple(pair_values) == (left, right) or tuple(reversed(pair_values)) == (left, right)


def _format_chat_pillar_line(label, snapshot):
    if not snapshot:
        return f"{label}: -"
    kanshi = snapshot.get("kanshi") or f"{snapshot.get('tenkan', '')}{snapshot.get('chishi', '')}"
    parts = [
        f"{label}: {kanshi}",
        f"天干={snapshot.get('tenkan', '-')}",
        f"地支={snapshot.get('chishi', '-')}",
        f"天干十神={snapshot.get('kan_tsuhen', '-')}",
        f"地支十神={snapshot.get('shi_tsuhen', '-')}",
        f"十二运={snapshot.get('seiun', '-')}",
        f"自坐={snapshot.get('jizuo', '-')}",
        f"空亡={snapshot.get('kubou', '-')}",
        f"纳音={snapshot.get('nayin', '-')}",
    ]
    if snapshot.get("flow_year"):
        parts.append(f"流年={snapshot.get('flow_year')}")
    if snapshot.get("date"):
        parts.append(f"起点={snapshot.get('date')}")
    if snapshot.get("start_year"):
        parts.append(f"大运期间={snapshot.get('start_year')}-{snapshot.get('end_year')}")
    return "；".join(parts)


def _detect_chat_timing_relations(pillars):
    relations = []

    for left_index, left in enumerate(pillars):
        for right in pillars[left_index + 1:]:
            left_stem = left.get("tenkan")
            right_stem = right.get("tenkan")
            if left_stem and right_stem and "不明" not in {left_stem, right_stem}:
                for relation_type, pairs in CHAT_STEM_RELATION_TABLES:
                    for pair in pairs:
                        if _chat_relation_pair_match(left_stem, right_stem, pair):
                            target = f"→{pair[2]}" if len(pair) > 2 else ""
                            relations.append(f"{left['label']}({left_stem}) × {right['label']}({right_stem})：{relation_type}{target}")

            left_branch = left.get("chishi")
            right_branch = right.get("chishi")
            if left_branch and right_branch and "不明" not in {left_branch, right_branch}:
                for relation_type, pairs in CHAT_BRANCH_RELATION_TABLES:
                    for pair in pairs:
                        if _chat_relation_pair_match(left_branch, right_branch, pair):
                            target = f"→{pair[2]}" if len(pair) > 2 else ""
                            relations.append(f"{left['label']}({left_branch}) × {right['label']}({right_branch})：{relation_type}{target}")

    for relation_type, group in CHAT_SANHE_TABLES + CHAT_SANHUI_TABLES:
        members = group[:3]
        matched = []
        matched_branches = set()
        for member in members:
            pillar = next((item for item in pillars if item.get("chishi") == member), None)
            if not pillar:
                break
            matched.append(pillar)
            matched_branches.add(member)
        if len(matched) == len(members) and set(members).issubset(matched_branches):
            labels = "・".join(f"{pillar['label']}({pillar.get('chishi')})" for pillar in matched)
            relations.append(f"{labels}：{relation_type}→{group[3]}")

    return relations


def build_chat_prompt_from_meishiki(bazi, precision_chart=None):
    precision = precision_chart or {}
    natal = precision.get("natal", {})
    active_daiun = precision.get("active_daiun")
    flow_year = precision.get("flow_year")
    flow_month = precision.get("flow_month")

    pillar_items = [
        {"label": "原局年柱", **(natal.get("year") or {})},
        {"label": "原局月柱", **(natal.get("month") or {})},
        {"label": "原局日柱", **(natal.get("day") or {})},
        {"label": "原局时柱", **(natal.get("time") or {})},
        {"label": "当前大运", **(active_daiun or {})},
        {"label": "当前流年", **(flow_year or {})},
        {"label": "当前流月", **(flow_month or {})},
    ]
    relations = _detect_chat_timing_relations(pillar_items)

    reference_prompt = "\n".join(
        [
            "<CHAT命局与近期运势参考>",
            f"[当前日期]：{precision.get('current_date', '-')}",
            f"[出生时间是否不明]：{precision.get('birth_time_unknown', False)}",
            "[原局四柱]",
            _format_chat_pillar_line("年柱", natal.get("year")),
            _format_chat_pillar_line("月柱", natal.get("month")),
            _format_chat_pillar_line("日柱", natal.get("day")),
            _format_chat_pillar_line("时柱", natal.get("time")),
            "[当前运势三层]",
            _format_chat_pillar_line("当前大运", active_daiun),
            _format_chat_pillar_line("当前流年", flow_year),
            _format_chat_pillar_line("当前流月", flow_month),
            "[当前大运/流年/流月与原局干支关系]",
            "\n".join(relations) if relations else "未检测到明显干合、干冲、支合、三合局、三会局、半合、暗合、支冲、刑、破、害关系。",
            "[原局刑冲合化裁决参考]",
            format_gouka_reference(getattr(bazi, "gouka", {})),
            "[原局流通辅助参考]",
            format_element_flow_reference(bazi),
            "[日主旺衰与能量参考]",
            format_shin_type_reference(bazi),
            "[十神能量占比参考]",
            format_shishen_ratio_reference(bazi),
        ]
    )

    gender_label = "男命" if int(bazi.gender) == 1 else "女命"
    user_prompt = (
        f"用户正在围绕此八字进行对话咨询。八字："
        f"{bazi.tenkan[0]}{bazi.chishi[0]}，{bazi.tenkan[1]}{bazi.chishi[1]}，"
        f"{bazi.tenkan[2]}{bazi.chishi[2]}，"
        f"{'时柱不明' if getattr(bazi, 'birth_time_unknown', False) else f'{bazi.tenkan[3]}{bazi.chishi[3]}'}，"
        f"{gender_label}。请优先结合当前大运、流年、流月回答。"
    )

    return [
        {
            "role": "system",
            "content": (
                "你是专业八字命理对话助手，专用于回答用户关于当前运势、近期变化、事业财运、关系状态、选择时机等问题。"
                "必须使用自然语言或 Markdown 回答，不要输出 JSON。"
                "回答时优先参考当前大运、流年、流月与原局的干支关系；特别注意刑、冲、破、害、合、半合、三合局、三会局、暗合、干合、干冲。"
                "需要分析思维回路、优势、问题和行为卡点时，必须参考[原局流通辅助参考]，区分流通链路与阻塞链路。"
                "不要把所有合都直接当成化，必须区分合、合绊、化意、化成。"
                "若出生时刻不明，涉及时柱、子女、晚年、精细格局时必须说明不确定性。"
                "不要编造 reference 中没有的事实；需要推断时说明命理依据。"
            ),
        },
        {"role": "system", "content": reference_prompt},
        {"role": "user", "content": user_prompt},
    ]


def _legacy_build_prompt_from_meishiki(bazi) -> str:
    """
    Build the exact 'bazi' string that DeepSeek should receive,
    using your own Meishi engine. This is a TEMPLATE—edit to your needs.
    """

    user_prompt = (
        "八字INPUT：{}{}，{}{}，{}{}，{}{}，({})，阳历（真太阳时）：{}"
        .format(
            bazi.tenkan[0], bazi.chishi[0],
            bazi.tenkan[1], bazi.chishi[1],
            bazi.tenkan[2], bazi.chishi[2],
            bazi.tenkan[3], bazi.chishi[3],
            "男命" if int(bazi.gender) == 1 else "女命",
            bazi.birthdate
        )
    )
    # 辅助信息参考提示词
    reference_prompt = (
        "<辅助信息参考>\n"
        "[八字排盘]：\n年柱:{}{}({})，{}{}({}) 藏干:[{}{}({}),{}{}({}),{}{}({})]。\n月柱:{}{}({})，{}{}({}) 藏干:[{}{}({}),{}{}({}),{}{}({})]。\n日柱:{}{}({})，{}{}({}) 藏干:[{}{}({}),{}{}({}),{}{}({})]。\n时柱:{}{}({})，{}{}({}) 藏干:[{}{}({}),{}{}({}),{}{}({})]。\n"
        .format(
            # 年柱
            bazi.tenkan[0], element_type_check(bazi.tenkan[0]), bazi.junshi[0][0],
            bazi.chishi[0], element_type_check(bazi.chishi[0]), bazi.junshi[3][0],
            # 藏干:
            bazi.meisiki["shi"][0]["zoukan"][0]["element"],element_type_check(bazi.meisiki["shi"][0]["zoukan"][0]["element"]),bazi.meisiki["shi"][0]["zoukan"][0]["tsuhen"],
            bazi.meisiki["shi"][0]["zoukan"][1]["element"],element_type_check(bazi.meisiki["shi"][0]["zoukan"][1]["element"]),bazi.meisiki["shi"][0]["zoukan"][1]["tsuhen"],
            bazi.meisiki["shi"][0]["zoukan"][2]["element"],element_type_check(bazi.meisiki["shi"][0]["zoukan"][2]["element"]),bazi.meisiki["shi"][0]["zoukan"][2]["tsuhen"],
            # 月柱
            bazi.tenkan[1], element_type_check(bazi.tenkan[1]), bazi.junshi[0][1],
            bazi.chishi[1], element_type_check(bazi.chishi[1]), bazi.junshi[3][1],
            # 藏干:
            bazi.meisiki["shi"][1]["zoukan"][0]["element"],element_type_check(bazi.meisiki["shi"][1]["zoukan"][0]["element"]),bazi.meisiki["shi"][1]["zoukan"][0]["tsuhen"],
            bazi.meisiki["shi"][1]["zoukan"][1]["element"],element_type_check(bazi.meisiki["shi"][1]["zoukan"][1]["element"]),bazi.meisiki["shi"][1]["zoukan"][1]["tsuhen"],
            bazi.meisiki["shi"][1]["zoukan"][2]["element"],element_type_check(bazi.meisiki["shi"][1]["zoukan"][2]["element"]),bazi.meisiki["shi"][1]["zoukan"][2]["tsuhen"],
            # 日主
            bazi.tenkan[2], element_type_check(bazi.tenkan[2]), bazi.junshi[0][2],
            bazi.chishi[2], element_type_check(bazi.chishi[2]), bazi.junshi[3][2],
            # 藏干:
            bazi.meisiki["shi"][2]["zoukan"][0]["element"],element_type_check(bazi.meisiki["shi"][2]["zoukan"][0]["element"]),bazi.meisiki["shi"][2]["zoukan"][0]["tsuhen"],
            bazi.meisiki["shi"][2]["zoukan"][1]["element"],element_type_check(bazi.meisiki["shi"][2]["zoukan"][1]["element"]),bazi.meisiki["shi"][2]["zoukan"][1]["tsuhen"],
            bazi.meisiki["shi"][2]["zoukan"][2]["element"],element_type_check(bazi.meisiki["shi"][2]["zoukan"][2]["element"]),bazi.meisiki["shi"][2]["zoukan"][2]["tsuhen"],
            # 时柱
            bazi.tenkan[3], element_type_check(bazi.tenkan[3]), bazi.junshi[0][3],
            bazi.chishi[3], element_type_check(bazi.chishi[3]), bazi.junshi[3][3],
            # 藏干:
            bazi.meisiki["shi"][3]["zoukan"][0]["element"],element_type_check(bazi.meisiki["shi"][3]["zoukan"][0]["element"]),bazi.meisiki["shi"][3]["zoukan"][0]["tsuhen"],
            bazi.meisiki["shi"][3]["zoukan"][1]["element"],element_type_check(bazi.meisiki["shi"][3]["zoukan"][1]["element"]),bazi.meisiki["shi"][3]["zoukan"][1]["tsuhen"],
            bazi.meisiki["shi"][3]["zoukan"][2]["element"],element_type_check(bazi.meisiki["shi"][3]["zoukan"][2]["element"]),bazi.meisiki["shi"][3]["zoukan"][2]["tsuhen"],
        )
    )

    # 十神提示

    reference_prompt += (
        "[刑沖破害・合化裁決]：{}\n"
        .format(format_gouka_reference(getattr(bazi, "gouka", {})))
    )

    reference_prompt += (
        "[日主旺衰判定]：{}\n"
        .format(format_shin_type_reference(bazi))
    )

    shishen_output = format_shishen_analysis(bazi.shishen_anlysis)

    # reference_prompt += (
    #     "[十神配置]:月令:{}{}({}), 分析参考:{}\n"
    #     .format(
    #         bazi.chishi[1], element_type_check(bazi.chishi[1]), bazi.junshi[3][1],
    #         shishen_output
    #     )
    # )

    # 十神提示
    # shishen_dist = format_shishen_output(bazi.element_energy["element_number"],reference=bazi.element_energy["relation"])
    # wuxin_season_dist = str(bazi.element_energy["season_energy"])
    # reference_prompt += (
    #     "[十神配置]：十神能量分布：{} , 十神旺相休囚情况：{}\n"
    #     .format(
    #         shishen_dist,wuxin_season_dist
    #     )
    # )


    # season = element_season_check(bazi.chishi[1])
    # yuelin = bazi.chishi[1]
    # yuelin_element = element_type_check(yuelin)
    # higen_element = element_type_check(bazi.higen)
    # reference_prompt += (
    #     "[旺衰参考]：{}{}生于{}月（{}季），{}为月令。日主{}{}，处{}{}之地,月令{}{}{},日主:{}(需辩证)。\n"
    #     .format(
    #         bazi.higen, element_type_check(bazi.higen),yuelin,season,bazi.chishi[1],
    #         bazi.higen, element_type_check(bazi.higen),higen_element,bazi.element_energy["season_energy"][higen_element],
    #         yuelin,yuelin_element,bazi.element_energy["season_energy"][yuelin_element],
    #         bazi.shin_type,
    #
    #     )
    # )
    #
    # younshen = ",".join(bazi.younjin["younjin"]["element"])
    # jishen = ",".join(bazi.younjin["kishin"]["element"])
    # reference_prompt += (
    #     "[喜忌五行]：喜：{}，忌：{}（旺衰法,需辩证判断）\n[调候参考]:命主生于{}季,{} (请参考《十神配置五行平衡情况》进行辩证判断)"
    #     .format(
    #         younshen,
    #         jishen,
    #         season,
    #         tiaohouReference(season)
    #     )
    # )

    #tiaohouReference

    #print(bazi.element_energy["season_energy"][yuelin_element])
    prompt_test = [
        {
            "role": "system",
            "content":
                "你是一名专业且经验丰富的八字命理学家，用户会提供其八字命盘信息，请根据输入八字命盘进行系统性、条理化、深入分析。"
                "<解盘描述需求>："
                "1. 每一个方面(entity)都必须书写为完整的多段落说明，要求内容详细，必须结合命理原理进行论证，并在每个论点中加入【举例说明】（说明该结论从八字哪里看出来、代表什么、为什么这样判断）。"
                "2. 每个分析必须包含三部分：优点、缺点、化解或改善建议（不得建议佩戴物品）。"
                "3. 所有判断都要有理有据，使用专业八字术语（如十神、五行、旺衰、格局、合化、刑冲、调候等），说明逻辑推导依据。"
                "4. 请保持讨论性语气，用专业语言自然、流畅、逻辑清晰。"
                "5. 每个部分的段落之间请使用换行符转义序列 \\n 进行分段。"
                "6. 可以参考<辅助信息参考>提供的内容，但请辩证使用，不可照搬。"
                "7. 输出必须为合法 JSON 格式，并完全符合下方格式模板。"
                "<输出格式(JSON 模板)>："
                "["
                "  {\"entity\": \"性格标签\", \"content\": \"请根据八字写出主核心的人格特质的<关键字>。\"},"
                "  {\"entity\": \"格局定位\", \"content\": \"八字格局定位，并找出这个人的天赋有哪些（举例说明），1.BUG在哪里（举例说明）2. 日主旺衰情况（注意分析和流通形以及合化带来的影响判断身旺弱）3.调候用神（需判断是否需要，例如太冷或太热\"},"
                "  {\"entity\": \"八字病药\", \"content\": \"分析命局中‘病’与‘药’（命理结构中不协调的部分）。说明命理上的不自洽点在哪里，用术语解释其成因。再从1.思维方式、2.生活习惯两个角度举例说明表现形式与影响，并提出具体化解方式（不得建议佩戴物品），说明命理依据。\"},"
                "  {\"entity\": \"性格特点\", \"content\": \"结合日主旺衰与十神配置详细说明命主性格底色、处事风格、价值观。每个性格特征都必须举例说明（例如：日主为庚金、坐寅木，说明外刚内柔等），并说明这种特质带来的优缺点及应对方法。\"},"
                "  {\"entity\": \"天赋优势\", \"content\": \"请重点分析该命局里的食神做工的方向，例如生财了，制杀了，合官了什么去详细描述命主的天赋与潜能。包括1. 擅长的事（举例说明为什么擅长），2. 不擅长的事（说明八字中何处导致），3. 潜在挑战与矛盾点（分析原因），4. 如何运用与发挥自身天赋（附推理过程）。\"},"
                "  {\"entity\": \"兴趣爱好\", \"content\": \"结合五行偏旺、十神取向、日主特质，推断命主可能的兴趣领域。每个结论都举例说明（例如食伤旺者喜表达艺术类活动），并分析背后的命理依据。\"},"
                "  {\"entity\": \"适合职业\", \"content\": \"根据十神配置、格局流通、喜忌情况分析命主适合的职业特性（不要写具体职业名）。说明其职业取向形成的命理原因。进一步指出潜在挑战及改进方向。每个判断都需有举例说明与命理依据。\"},"
                "  {\"entity\": \"家庭方面\", \"content\": \"分析父母星、年支、月支情况，说明1. 父母的性格或状况；2. 与父母的关系；3. 核心矛盾与成长影响。每个结论都要附命理来源说明。\"},"
                "  {\"entity\": \"姻缘方面\", \"content\": \"结合夫妻宫与夫/妻星详细分析：1. 夫/妻星喜忌；2. 是否能入局（刑冲破害）；3. 夫妻宫坐实与否（解释含义并举例）；4. 官杀/财才是否混杂及影响；5. 感情模式与挑战。每点都要附命理依据与举例说明。\"},"
                "  {\"entity\": \"伴侣价值观\", \"content\": \"请详细描述伴侣的价值观体系，包括核心信念、行为取向、人际观与人生观。结合夫/妻星与十神分析其思维逻辑与态度，举例说明命理上如何体现（例如：财星旺者重现实）。\"},"
                "  {\"entity\": \"伴侣情况\", \"content\": \"结合命局与配偶星推断伴侣的外貌、性格、行业倾向、兴趣爱好与出身背景。每个方面必须举例说明命理来源（如官星清纯代表伴侣气质端庄等）。\"},"
                "  {\"entity\": \"伴侣互动方式\", \"content\": \"结合夫妻宫与夫/妻星综合判断双方沟通模式、生活方式与互动习惯。说明八字中哪些结构显示出这种互动倾向，并举例说明（例如：食神合官者喜以温和交流）。\"}"
                "]"
                "<输出要求>："
                "- 输出必须是 JSON 数组形式（[] 包裹）。"
                "- 每个 entity 的内容都需包含多段文字，用 \\n 分段。"
                "- 每一条论述必须详细、有例、有因果说明。"
                "- 禁止输出 JSON 之外的文字（如“以下是结果”）。"
                "- 若信息不足，请合理推断但说明依据。"
        },

        #  格局：财旺局（参考）。
        # {"role": "system", "content": "<辅助信息参考>"
        # "[十神配置]：年柱：丁丑（丁火正官，丑土正印）。月柱：壬寅（壬水食神，寅木偏财）。日柱：庚辰（庚金日元，辰土偏印）。时柱：辛巳（辛金劫财，巳火七杀）"
        # "[日主旺衰]：庚金生于寅月（春季），寅为月令，木旺火相，日主庚金处囚之地。日主不得令，身偏弱。"
        # "[喜行五行]：金土（旺衰法），调候参考：春秋气候适中，若无显著汗湿或燥热，则无需调后。"
        # "[格局参考]：财旺局（关键词：目标感，耐力，韧性，细节，执行）"
        # "[夫妻星]:妻星：木：正财：乙木（藏辰土），偏财：甲木（藏寅木），夫妻宫：辰土（偏印）（喜）"
        # "[大运]： 年干丁火（阴干）故走逆行运：辛丑，庚子，己亥，戊戌，丁酉，丙申，乙末，甲午，癸巳。 起运时间：出身后1年0个月。 当前大运：己亥。"
        #  },
        {"role": "system", "content": reference_prompt},
        {
            "role": "system",
            "content": "请优先参考[刑沖破害・合化裁決]。不得把所有“合”直接当作“化”，必须区分原始检出与裁决后的成立、減力、失效、化成。",
        },
        {
            "role": "system",
            "content": "分析日主旺衰、格局定位、喜忌与病药时，必须优先参考[日主旺衰判定]中的原局判定、同行/異行比例与制化裁決補正後参考；若自行修正结论，必须说明命理理由。",
        },

        {"role": "user", "content": user_prompt},

    ]
    # Send ISO + hints if you don’t have Meishi wired up yet.
    print(prompt_test)

    return prompt_test


def build_prompt_from_meishiki(bazi) -> str:
    gender_label = "男命" if int(bazi.gender) == 1 else "女命"
    if _is_birth_time_unknown(bazi):
        user_prompt = (
            "八字INPUT：{}{}，{}{}，{}{}，時柱不明，（{}），阳历（真太阳时）：{}"
            .format(
                bazi.tenkan[0], bazi.chishi[0],
                bazi.tenkan[1], bazi.chishi[1],
                bazi.tenkan[2], bazi.chishi[2],
                gender_label,
                _format_birth_label(bazi),
            )
        )
    else:
        user_prompt = (
            "八字INPUT：{}{}，{}{}，{}{}，{}{}，（{}），阳历（真太阳时）：{}"
            .format(
                bazi.tenkan[0], bazi.chishi[0],
                bazi.tenkan[1], bazi.chishi[1],
                bazi.tenkan[2], bazi.chishi[2],
                bazi.tenkan[3], bazi.chishi[3],
                gender_label,
                _format_birth_label(bazi),
            )
        )

    reference_prompt = (
        "<辅助信息参考>\n"
        f"[出生时间]：{getattr(bazi, 'birth_time_display', UNKNOWN_BIRTH_TIME_TEXT if _is_birth_time_unknown(bazi) else bazi.birthdate.strftime('%H:%M'))}"
    )
    if _is_birth_time_unknown(bazi):
        reference_prompt += "（時刻不明。時柱・時柱蔵干・時柱十神、および完全な四柱に依存する細分判断には不確定性があります。）\n"
    else:
        reference_prompt += "（已知）\n"

    reference_prompt += (
        "[八字排盘]：\n"
        + _format_pillar_reference_line(bazi, 0, "年柱")
        + _format_pillar_reference_line(bazi, 1, "月柱")
        + _format_pillar_reference_line(bazi, 2, "日柱")
        + _format_time_pillar_reference_line(bazi)
    )
    reference_prompt += f"[十神能量占比]：{format_shishen_ratio_reference(bazi)}"
    if _is_birth_time_unknown(bazi):
        reference_prompt += "（出生時刻不明のため、内部占位時刻ベースの参考値です。時柱依存の定量判断には使わないでください。）\n"
    else:
        reference_prompt += "\n"

    if _is_birth_time_unknown(bazi):
        reference_prompt += "[刑冲破害・合化裁决]：出生時刻不明のため、時柱に関わる関係は暫定的に判定しません。時柱を既知の事実として扱わないでください。\n"
        reference_prompt += (
            "[流通辅助信息]：{}\n"
            .format(format_element_flow_reference(bazi))
        )
        reference_prompt += "[日主旺衰判断]：出生時刻不明のため、完全な四柱での旺衰・格局細分・制化補正には不確定性があります。年月日三柱を主として辨証し、時柱依存の結論は保留と明記してください。\n"
    else:
        reference_prompt += (
            "[刑冲破害・合化裁决]：{}\n"
            .format(format_gouka_reference(getattr(bazi, "gouka", {})))
        )
        reference_prompt += (
            "[流通辅助信息]：{}\n"
            .format(format_element_flow_reference(bazi))
        )
        reference_prompt += (
            "[日主旺衰判断]：{}\n"
            .format(format_shin_type_reference(bazi))
        )
    prompt_test = [
        {
            "role": "system",
            "content":
                "你是一名专业且经验丰富的八字命理学家，用户会提供其八字命盘信息，请根据输入八字命盘进行系统性、条理化、深入分析。"
                "<解盘描述需求>："
                "1. 每一个方面(entity)都必须书写为完整的多段落说明，要求内容详细，必须结合命理原理进行论证，并在每个论点中加入【举例说明】（说明该结论从八字哪里看出来、代表什么、为什么这样判断）。"
                "2. 每个分析必须包含三部分：优点、缺点、化解或改善建议（不得建议佩戴物品）。"
                "3. 所有判断都要有理有据，使用专业八字术语（如十神、五行、旺衰、格局、合化、刑冲、调候等），说明逻辑推导依据。"
                "4. 请保持讨论性语气，用专业语言自然、流畅、逻辑清晰。"
                "5. 每个部分的段落之间请使用换行符转义序列 \\n 进行分段。"
                "6. 可以参考<辅助信息参考>提供的内容，但请辨证使用，不可照搬。"
                "7. 输出必须为合法 JSON 格式，并完全符合下方格式模板。"
                "<输出格式(JSON 模板)>："
                "["
                "  {\"entity\": \"性格标签\", \"content\": \"请根据八字写出主核心的人格特质的<关键字>。\"},"
                "  {\"entity\": \"格局定位\", \"content\": \"八字格局定位，并找出这个人的天赋有哪些（举例说明），1.BUG在哪里（举例说明）2. 日主旺衰情况（注意分析和流通形以及合化带来的影响判断身旺弱）3.调候用神（需判断是否需要，例如太冷或太热\"},"
                "  {\"entity\": \"八字病药\", \"content\": \"分析命局中‘病’与‘药’（命理结构中不协调的部分）。必须结合[流通辅助信息]判断这个人的思维回路、能量传导顺畅处与卡点在哪里；说明命理上的不自洽点在哪里，用术语解释其成因。再从1.思维方式、2.生活习惯两个角度举例说明表现形式与影响，并提出具体化解方式（不得建议佩戴物品），说明命理依据。\"},"
                "  {\"entity\": \"性格特点\", \"content\": \"结合日主旺衰与十神配置详细说明命主性格底色、处事风格、价值观。每个性格特征都必须举例说明（例如：日主为庚金、坐寅木，说明外刚内柔等），并说明这种特质带来的优缺点及应对方法。\"},"
                "  {\"entity\": \"思维回路\", \"content\": \"必须利用[流通辅助信息]分析命主的思维回路与能量传导方式：1. 哪些链路流通，代表何种自然反应、理解方式、决策习惯与优势；2. 哪些链路阻塞，代表何种内耗、误判、纠结或行动卡点；3. 这些优势和问题在学习、工作、人际中的具体表现；4. 如何训练和修正阻塞处。每一点都必须说明对应的天干/地支/十神/五行依据，并举例说明。\"},"
                "  {\"entity\": \"天赋优势\", \"content\": \"请详细描述命主的天赋与潜能。必须参考[流通辅助信息]区分流通处带来的优势、自然反应和做事顺手处，以及阻塞处带来的问题、误判和内耗。包括1. 擅长的事（举例说明为什么擅长），2. 不擅长的事（说明八字中何处导致），3. 潜在挑战与矛盾点（分析原因），4. 如何运用与发挥自身天赋（附推理过程）。\"},"
                "  {\"entity\": \"兴趣爱好\", \"content\": \"结合五行偏旺、十神取向、日主特质，推断命主可能的兴趣领域。每个结论都举例说明（例如食伤旺者喜表达艺术类活动），并分析背后的命理依据。\"},"
                "  {\"entity\": \"适合职业\", \"content\": \"根据十神配置、格局流通、喜忌情况分析命主适合的职业特性（不要写具体职业名）。说明其职业取向形成的命理原因。进一步指出潜在挑战及改进方向。每个判断都需有举例说明与命理依据。\"},"
                "  {\"entity\": \"家庭方面\", \"content\": \"分析父母星、年支、月支情况，说明1. 父母的性格或状况；2. 与父母的关系；3. 核心矛盾与成长影响。每个结论都要附命理来源说明。\"},"
                "  {\"entity\": \"姻缘方面\", \"content\": \"结合夫妻宫与夫/妻星详细分析：1. 夫/妻星喜忌；2. 是否能入局（刑冲破害）；3. 夫妻宫坐实与否（解释含义并举例）；4. 官杀/财才是否混杂及影响；5. 感情模式与挑战。每点都要附命理依据与举例说明。\"},"
                "  {\"entity\": \"伴侣价值观\", \"content\": \"请详细描述伴侣的价值观体系，包括核心信念、行为取向、人际观与人生观。结合夫/妻星与十神分析其思维逻辑与态度，举例说明命理上如何体现（例如：财星旺者重现实）。\"},"
                "  {\"entity\": \"伴侣情况\", \"content\": \"结合命局与配偶星推断伴侣的外貌、性格、行业倾向、兴趣爱好与出身背景。每个方面必须举例说明命理来源（如官星清纯代表伴侣气质端庄等）。\"},"
                "  {\"entity\": \"伴侣互动方式\", \"content\": \"结合夫妻宫与夫/妻星综合判断双方沟通模式、生活方式与互动习惯。说明八字中哪些结构显示出这种互动倾向，并举例说明（例如：食神合官者喜以温和交流）。\"}"
                "]"
                "<输出要求>："
                "- 输出必须是 JSON 数组形式（[] 包裹）。"
                "- 每个 entity 的内容都需包含多段文字，用 \\n 分段。"
                "- 每一条论述必须详细、有例、有因果说明。"
                "- 禁止输出 JSON 之外的文字（如“以下是结果”）。"
                "- 若信息不足，请合理推断但说明依据。"
        },
        {"role": "system", "content": reference_prompt},
        {
            "role": "system",
            "content": "请优先参考[刑冲破害・合化裁决]。不得把所有“合”直接当作“化”，必须区分原始检出与裁决后的成立、减力、失效、化成。",
        },
        {
            "role": "system",
            "content": "分析日主旺衰、格局定位、喜忌与病药时，必须优先参考[日主旺衰判断]中的原局判断、同行/异行比例与制化裁决补正后参考；若自行修正结论，必须说明命理理由。",
        },
        {
            "role": "system",
            "content": "分析思维回路、天赋优势、问题卡点、病药与行为模式时，必须参考[流通辅助信息]：流通链路代表能量自然传导、顺手优势和默认反应；阻塞链路代表内耗、冲突、误判与需要训练修正的位置。",
        },
        {"role": "user", "content": user_prompt},
    ]
    print(prompt_test)
    return prompt_test


def _format_sections_for_element_insight_prompt(sections):
    lines = []
    for item in sections:
        if not isinstance(item, dict):
            continue
        entity = str(item.get("entity") or "").strip()
        content = str(item.get("content") or "").strip()
        if not entity or not content:
            continue
        lines.append(f"[{entity}]\n{content}")
    return "\n\n".join(lines)


def build_element_insight_prompt(bazi, sections) -> list[dict]:
    gender_label = "男命" if int(bazi.gender) == 1 else "女命"
    if _is_birth_time_unknown(bazi):
        user_prompt = (
            "八字INPUT：{}{}，{}{}，{}{}，时柱不明，（{}），阳历（真太阳时）：{}"
            .format(
                bazi.tenkan[0], bazi.chishi[0],
                bazi.tenkan[1], bazi.chishi[1],
                bazi.tenkan[2], bazi.chishi[2],
                gender_label,
                _format_birth_label(bazi),
            )
        )
    else:
        user_prompt = (
            "八字INPUT：{}{}，{}{}，{}{}，{}{}，（{}），阳历（真太阳时）：{}"
            .format(
                bazi.tenkan[0], bazi.chishi[0],
                bazi.tenkan[1], bazi.chishi[1],
                bazi.tenkan[2], bazi.chishi[2],
                bazi.tenkan[3], bazi.chishi[3],
                gender_label,
                _format_birth_label(bazi),
            )
        )

    reference_prompt = (
        "<辅助信息参考>\n"
        f"[出生时间]：{getattr(bazi, 'birth_time_display', UNKNOWN_BIRTH_TIME_TEXT if _is_birth_time_unknown(bazi) else bazi.birthdate.strftime('%H:%M'))}\n"
        "[八字排盘]：\n"
        + _format_pillar_reference_line(bazi, 0, "年柱")
        + _format_pillar_reference_line(bazi, 1, "月柱")
        + _format_pillar_reference_line(bazi, 2, "日柱")
        + _format_time_pillar_reference_line(bazi)
        + f"[十神能量占比]：{format_shishen_ratio_reference(bazi)}\n"
    )
    if _is_birth_time_unknown(bazi):
        reference_prompt += (
            "[流通辅助信息]：{}\n".format(format_element_flow_reference(bazi))
            + "[日主旺衰判断]：出生时刻不明，请以年月日三柱为主辨证，时柱相关细分保持保留。\n"
        )
    else:
        reference_prompt += (
            "[刑冲破害・合化裁决]：{}\n".format(format_gouka_reference(getattr(bazi, "gouka", {})))
            + "[流通辅助信息]：{}\n".format(format_element_flow_reference(bazi))
            + "[日主旺衰判断]：{}\n".format(format_shin_type_reference(bazi))
        )

    return [
        {
            "role": "system",
            "content": (
                "你是一名专业且经验丰富的八字命理学家。现在不要重写整份命盘总解读，"
                "而是基于已经完成的命盘主解读，专门为本命四柱各个指定元素生成点击弹窗用的中文解说。"
            ),
        },
        {"role": "system", "content": reference_prompt},
        {
            "role": "system",
            "content": (
                "[已生成AI解读]：\n"
                f"{_format_sections_for_element_insight_prompt(sections)[:16000]}\n\n"
                "[命式要素解读目标]：以下 key 仅用于本命四柱点击解读，请严格按 key 输出，每个 key 的 title 和 content 都必须使用中文，不要输出日文，不要编造未列出的 key。\n"
                f"{format_element_insight_reference(bazi)}"
            ),
        },
        {
            "role": "system",
            "content": (
                "最终输出必须是一个合法 JSON 对象。对象的 key 只能使用[命式要素解读目标]中列出的 key。"
                "每个 key 的 value 格式固定为 {\"title\": \"中文标题\", \"content\": \"中文正文\"}。"
                "不要输出 sections，不要输出额外字段，不要输出 markdown 代码块。"
                "每条 content 都要面向初学者，解释这个位置代表什么、为什么这样看、在这张命局里怎么做工，"
                "并且必须结合柱位、十神、格局、旺衰、流通、病药与主解读结论。"
                "如果某个 key 证据不足，可以省略该 key，但不要输出 null。"
            ),
        },
        {"role": "user", "content": user_prompt},
    ]

# 冬季亥子丑月，需火来解冻暖局，见火为吉。
# 夏季巳午未月，需水来降温润局，水运不错。
# 春秋气候适中，若无显著汗湿或燥热，则无需调后。
