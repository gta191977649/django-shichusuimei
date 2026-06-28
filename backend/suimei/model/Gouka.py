class Gouka:
    kangou = [
        ("甲", "己", "土"),
        ("乙", "庚", "金"),
        ("丙", "辛", "水"),
        ("丁", "壬", "木"),
        ("戊", "癸", "火"),
    ]

    shigou = [
        ("子", "丑", "土"),
        ("辰", "酉", "金"),
        ("申", "巳", "水"),
        ("寅", "亥", "木"),
        ("午", "未", "火/土"),
        ("卯", "戌", "火"),
    ]

    shi_angou = [
        ("寅", "丑"),
        ("申", "卯"),
        ("午", "亥"),
        ("子", "巳"),
    ]

    kanchu = [
        ("甲", "庚"),
        ("乙", "辛"),
        ("丙", "壬"),
        ("丁", "癸"),
    ]

    kanka = [
        ("丙", "庚"),
        ("丁", "辛"),
        ("甲", "戊"),
        ("乙", "己"),
        ("戊", "壬"),
        ("己", "癸"),
    ]

    chichu = [
        ("午", "子"),
        ("未", "丑"),
        ("申", "寅"),
        ("酉", "卯"),
        ("戌", "辰"),
        ("亥", "巳"),
    ]

    shigai = [
        ("酉", "戌"),
        ("申", "亥"),
        ("未", "子"),
        ("午", "丑"),
        ("巳", "寅"),
        ("辰", "卯"),
    ]

    shiha = [
        ("酉", "子"),
        ("辰", "丑"),
        ("亥", "寅"),
        ("午", "卯"),
        ("申", "巳"),
        ("未", "戌"),
    ]

    shijikei = [
        ("辰", "辰"),
        ("午", "午"),
        ("酉", "酉"),
        ("亥", "亥"),
    ]

    shikei = [
        ("子", "卯"),
        ("寅", "巳"),
        ("巳", "申"),
        ("申", "寅"),
        ("丑", "戌"),
        ("戌", "未"),
        ("未", "丑"),
    ]

    stem_to_element = {
        "甲": "木",
        "乙": "木",
        "丙": "火",
        "丁": "火",
        "戊": "土",
        "己": "土",
        "庚": "金",
        "辛": "金",
        "壬": "水",
        "癸": "水",
    }

    branch_to_element = {
        "寅": "木",
        "卯": "木",
        "巳": "火",
        "午": "火",
        "申": "金",
        "酉": "金",
        "亥": "水",
        "子": "水",
        "辰": "土",
        "戌": "土",
        "丑": "土",
        "未": "土",
    }

    pillar_names = {
        0: "年柱",
        1: "月柱",
        2: "日柱",
        3: "時柱",
    }

    pillar_weights = {
        0: 0.9,
        1: 1.3,
        2: 1.2,
        3: 1.0,
    }

    relation_base_scores = {
        "干合": 62,
        "支合": 60,
        "暗合": 48,
        "干沖": 72,
        "支沖": 74,
        "干剋": 58,
        "支害": 54,
        "支破": 50,
        "支刑": 57,
        "自刑": 52,
    }

    conflict_penalties = {
        "沖": 22,
        "刑": 12,
        "害": 10,
        "破": 10,
        "剋": 8,
        "合": 6,
        "暗合": 4,
    }

    def __init__(self, meishiki):
        self.meishiki = meishiki
        self.higen = meishiki["kan"][2]["element"]
        self.tsukiren = meishiki["shi"][1]["element"]
        self.element_support = self._build_element_support()

        raw_kan = self._detect_kan_relations()
        raw_shi = self._detect_shi_relations()
        resolved_kan, effective_kan = self._resolve_candidates(raw_kan)
        resolved_shi, effective_shi = self._resolve_candidates(raw_shi)

        self.gouka = {
            "kan": raw_kan,
            "shi": raw_shi,
            "resolved": {
                "kan": resolved_kan,
                "shi": resolved_shi,
                "effective_kan": effective_kan,
                "effective_shi": effective_shi,
                "summary": self._build_summary(resolved_kan + resolved_shi, effective_kan + effective_shi),
            },
        }

    def check(self, element_1, element_2, relation_type):
        pair_key = (element_1, element_2)
        relation_table = self.chichu
        if relation_type == "干沖":
            relation_table = self.kanchu
        if relation_type == "干剋":
            relation_table = self.kanka
        if relation_type == "暗合":
            relation_table = self.shi_angou
        if relation_type == "支沖":
            relation_table = self.chichu
        if relation_type == "支害":
            relation_table = self.shigai
        if relation_type == "支破":
            relation_table = self.shiha
        if relation_type == "支刑":
            relation_table = self.shikei
        if relation_type == "自刑":
            relation_table = self.shijikei

        for pair in relation_table:
            if tuple(pair[:2]) == pair_key or tuple(reversed(pair[:2])) == pair_key:
                return True

        return False

    def check_shigou(self, shi_1, shi_2):
        shi_pair = {shi_1, shi_2}
        for pair in self.shigou:
            if set(pair[:2]) == shi_pair:
                return pair[2]
        return None

    def check_kangou(self, kan_1, kan_2):
        kan_pair = {kan_1, kan_2}
        for pair in self.kangou:
            if set(pair[:2]) == kan_pair:
                return pair[2]
        return None

    def _detect_kan_relations(self):
        relations = []
        for i, kan_data in enumerate(self.meishiki["kan"]):
            kan_1 = kan_data["element"]
            for j in range(i + 1, len(self.meishiki["kan"])):
                kan_2 = self.meishiki["kan"][j]["element"]

                result = self.check_kangou(kan_1, kan_2)
                if result:
                    relations.append(self._build_candidate("kan", "干合", "合", [kan_1, kan_2], [i, j], result))

                if self.check(kan_1, kan_2, "干沖"):
                    relations.append(self._build_candidate("kan", "干沖", "沖", [kan_1, kan_2], [i, j]))

                if self.check(kan_1, kan_2, "干剋"):
                    relations.append(self._build_candidate("kan", "干剋", "剋", [kan_1, kan_2], [i, j]))

        return relations

    def _detect_shi_relations(self):
        relations = []
        for i, shi_data in enumerate(self.meishiki["shi"]):
            shi_1 = shi_data["element"]
            for j in range(i + 1, len(self.meishiki["shi"])):
                shi_2 = self.meishiki["shi"][j]["element"]

                result = self.check_shigou(shi_1, shi_2)
                if result:
                    relations.append(self._build_candidate("shi", "支合", "合", [shi_1, shi_2], [i, j], result))

                if self.check(shi_1, shi_2, "暗合"):
                    relations.append(self._build_candidate("shi", "暗合", "暗合", [shi_1, shi_2], [i, j]))

                if self.check(shi_1, shi_2, "支沖"):
                    relations.append(self._build_candidate("shi", "支沖", "沖", [shi_1, shi_2], [i, j]))

                if self.check(shi_1, shi_2, "支害"):
                    relations.append(self._build_candidate("shi", "支害", "害", [shi_1, shi_2], [i, j]))

                if self.check(shi_1, shi_2, "支破"):
                    relations.append(self._build_candidate("shi", "支破", "破", [shi_1, shi_2], [i, j]))

                if self.check(shi_1, shi_2, "支刑"):
                    relations.append(self._build_candidate("shi", "支刑", "刑", [shi_1, shi_2], [i, j]))

                if self.check(shi_1, shi_2, "自刑"):
                    relations.append(self._build_candidate("shi", "自刑", "刑", [shi_1, shi_2], [i, j]))

        return relations

    def _build_candidate(self, realm, relation_type, kind, elements, indexes, to=None):
        return {
            "realm": realm,
            "type": relation_type,
            "kind": kind,
            "element": elements,
            "to": to,
            "index": indexes,
        }

    def _resolve_candidates(self, candidates):
        resolved = []
        effective = []

        for candidate in candidates:
            resolved_candidate = self._score_candidate(candidate, candidates)
            transform_detail = self._judge_transformation(resolved_candidate, candidates)
            resolved_candidate["transform"] = transform_detail
            resolved.append(resolved_candidate)

            if resolved_candidate["state"] != "失效":
                effective.append(self._as_effect_item(resolved_candidate))
            if transform_detail["state"] == "化成":
                effective.append(self._as_transform_effect_item(resolved_candidate, transform_detail))

        return resolved, effective

    def _score_candidate(self, candidate, peers):
        indexes = candidate["index"]
        shared_relations = [peer for peer in peers if peer is not candidate and self._shares_member(candidate, peer)]
        score = self.relation_base_scores[candidate["type"]]
        reasons = []
        blocked_by = []

        position_weight = sum(self.pillar_weights[idx] for idx in indexes)
        score += (position_weight - 2.0) * 10
        reasons.append(
            f"{self._format_pillar_pair(indexes)} 参与，柱位权重={position_weight:.1f}"
        )

        if abs(indexes[0] - indexes[1]) == 1:
            score += 6
            reasons.append("相邻柱互动，作用力加重")

        if 1 in indexes:
            score += 4
            reasons.append("涉及月柱，月令引动加分")

        if 2 in indexes and candidate["realm"] == "shi":
            score += 4
            reasons.append("涉及日支，宫位体感更直接")

        for peer in shared_relations:
            if candidate["kind"] in {"合", "暗合"} and peer["kind"] in {"沖", "刑", "害", "破", "剋"}:
                penalty = self.conflict_penalties.get(peer["kind"], 8)
                score -= penalty
                blocked_by.append(peer["type"])
                reasons.append(f"受 {peer['type']} 牵制，减 {penalty} 分")
            elif candidate["kind"] == "沖" and peer["kind"] in {"合", "暗合"}:
                score -= 8
                blocked_by.append(peer["type"])
                reasons.append(f"与 {peer['type']} 同时作用，形成合绊冲")
            elif candidate["kind"] in {"刑", "害", "破", "剋"} and peer["kind"] in {"合", "暗合"}:
                score -= 6
                blocked_by.append(peer["type"])
                reasons.append(f"受 {peer['type']} 缓冲，杀伤力减弱")
            elif candidate["kind"] in {"合", "暗合"} and peer["kind"] in {"合", "暗合"}:
                score -= 4
                blocked_by.append(peer["type"])
                reasons.append(f"出现争合/妒合，关系不纯")

        score = max(0, min(100, round(score, 1)))
        state = "成立" if score >= 70 else ("減力" if score >= 50 else "失效")

        if not blocked_by:
            reasons.append("命局内未见同成员的强阻断关系")

        resolved = dict(candidate)
        resolved.update(
            {
                "score": score,
                "state": state,
                "blocked_by": blocked_by,
                "reasons": reasons,
            }
        )
        return resolved

    def _judge_transformation(self, candidate, peers):
        if candidate["type"] not in {"干合", "支合"}:
            return {
                "eligible": False,
                "state": "不适用",
                "score": 0,
                "reasons": [],
            }

        target = candidate.get("to")
        if not target:
            return {
                "eligible": False,
                "state": "不适用",
                "score": 0,
                "reasons": [],
            }

        if "/" in target:
            return {
                "eligible": True,
                "state": "不化",
                "score": 0,
                "reasons": [f"{candidate['type']} 的化神为 {target}，目标不专一，先只判合不判化"],
            }

        if candidate["state"] == "失效":
            return {
                "eligible": True,
                "state": "不化",
                "score": 0,
                "reasons": [f"{candidate['type']} 本身已失效，不能再判成化"],
            }

        support = self.element_support["weighted"].get(target, 0)
        visible = self.element_support["visible"].get(target, 0)
        month_bonus = 12 if self.branch_to_element.get(self.tsukiren) == target else 0
        transform_score = 35 + candidate["score"] * 0.45 + support * 10 + visible * 6 + month_bonus
        reasons = [
            f"化神={target}",
            f"全局 {target} 支持度={support:.2f}",
            f"{target} 透出数={visible}",
        ]

        for peer in peers:
            if peer is candidate or not self._shares_member(candidate, peer):
                continue
            if peer["kind"] == "沖":
                transform_score -= 22
                reasons.append(f"受 {peer['type']} 冲开，化力明显下降")
            elif peer["kind"] in {"刑", "害", "破", "剋"}:
                transform_score -= 10
                reasons.append(f"受 {peer['type']} 扰动，化力减弱")
            elif peer["kind"] in {"合", "暗合"}:
                transform_score -= 6
                reasons.append(f"出现争合，化神不纯")

        transform_score = max(0, min(100, round(transform_score, 1)))
        transform_state = "化成" if transform_score >= 85 else ("有化意" if transform_score >= 65 else "不化")
        return {
            "eligible": True,
            "state": transform_state,
            "score": transform_score,
            "reasons": reasons,
        }

    def _as_effect_item(self, candidate):
        item = {
            "type": candidate["type"],
            "element": candidate["element"],
            "to": candidate.get("to"),
            "index": candidate["index"],
            "score": candidate["score"],
            "state": candidate["state"],
            "reasons": candidate["reasons"],
        }
        if candidate["transform"]["eligible"]:
            item["transform_state"] = candidate["transform"]["state"]
        return item

    def _as_transform_effect_item(self, candidate, transform_detail):
        return {
            "type": "干化" if candidate["realm"] == "kan" else "支化",
            "element": candidate["element"],
            "to": candidate.get("to"),
            "index": candidate["index"],
            "score": transform_detail["score"],
            "state": transform_detail["state"],
            "reasons": transform_detail["reasons"],
            "source_type": candidate["type"],
        }

    def _shares_member(self, left, right):
        return bool(set(left["index"]) & set(right["index"]))

    def _build_summary(self, resolved_candidates, effective_candidates):
        summary = []
        if not resolved_candidates:
            return ["命局内未检测到刑沖破害、干合支合等关系。"]

        for candidate in resolved_candidates:
            text = (
                f"{self._format_pillar_pair(candidate['index'])}"
                f"{candidate['element'][0]}-{candidate['element'][1]} {candidate['type']}：{candidate['state']}"
                f"（score={candidate['score']}）"
            )
            transform = candidate.get("transform", {})
            if transform.get("eligible"):
                text += f"，化判定={transform['state']}"
            if candidate["blocked_by"]:
                text += f"，受 {','.join(candidate['blocked_by'])} 牵制"
            summary.append(text)

        transform_effects = [item for item in effective_candidates if item["type"] in {"干化", "支化"}]
        if transform_effects:
            transform_text = "；".join(
                f"{self._format_pillar_pair(item['index'])}{item['element'][0]}-{item['element'][1]} {item['type']}→{item['to']}"
                for item in transform_effects
            )
            summary.append(f"成化成立：{transform_text}")
        else:
            summary.append("本盘未见达到成化阈值的关系，合与化已分离判读。")

        return summary

    def _build_element_support(self):
        weighted = {"木": 0.0, "火": 0.0, "土": 0.0, "金": 0.0, "水": 0.0}
        visible = {"木": 0, "火": 0, "土": 0, "金": 0, "水": 0}

        for kan in self.meishiki["kan"]:
            element = self.symbol_to_element(kan["element"])
            if not element:
                continue
            weighted[element] += 1.0
            visible[element] += 1

        for shi in self.meishiki["shi"]:
            element = self.symbol_to_element(shi["element"])
            if element:
                weighted[element] += 1.1

            for idx, zoukan in enumerate(shi.get("zoukan", [])):
                symbol = zoukan.get("element")
                if not symbol:
                    continue
                hidden_element = self.symbol_to_element(symbol)
                if not hidden_element:
                    continue
                weighted[hidden_element] += 0.6 if idx == 0 else (0.4 if idx == 1 else 0.25)

        return {
            "weighted": weighted,
            "visible": visible,
        }

    def symbol_to_element(self, symbol):
        if symbol in self.stem_to_element:
            return self.stem_to_element[symbol]
        return self.branch_to_element.get(symbol)

    def _format_pillar_pair(self, indexes):
        return f"{self.pillar_names[indexes[0]]}-{self.pillar_names[indexes[1]]}"
