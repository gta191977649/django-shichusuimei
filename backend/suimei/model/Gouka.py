class Gouka:
    # 干合 (天干)
    kangou = [
        ("甲", "己", "土"),
        ("乙", "庚", "金"),
        ("丙", "辛", "水"),
        ("丁", "壬", "木"),
        ("戊", "癸", "火"),
    ]

    # 支合 (地支) 六合
    shigou = [
        ("子", "丑", "土"),
        ("辰", "酉", "金"),
        ("申", "巳", "水"),
        ("寅", "亥", "木"),
        ("午", "未", "火/土"), # 火/土
        ("卯", "戌", "火"),
    ]
    # 支合 (地支) 暗合
    shi_angou = [
        ("寅", "丑"),
        ("申", "卯"),
        ("午", "亥"),
        ("子", "巳"),
    ]

    # 干冲 (天干)
    kanchu = [
        ("甲", "庚"),
        ("乙", "辛"),
        ("丙", "壬"),
        ("丁", "癸"),
    ]
    # 干克
    kanka = [
        ("丙", "庚"),
        ("丁", "辛"),
        ("甲", "戊"),
        ("乙", "己"),
        ("戊", "壬"),
        ("己", "癸"),
    ]

    # 支冲 (地支)
    chichu = [
        ("午", "子"),
        ("未", "丑"),
        ("申", "寅"),
        ("酉", "卯"),
        ("戌", "辰"),
        ("亥", "巳"),
    ]

    # 支害 (地支)
    shigai = [
        ("酉", "戌"),
        ("申", "亥"),
        ("未", "子"),
        ("午", "丑"),
        ("巳", "寅"),
        ("辰", "卯"),
    ]
    # 支破 (地支)
    shiha = [
        ("酉", "子"),
        ("辰", "丑"),
        ("亥", "寅"),
        ("午", "卯"),
        ("申", "巳"),
        ("未", "戌"),
    ]
    # 自刑 (地支)
    shijikei = [
        ("辰", "辰"),
        ("午", "午"),
        ("酉", "酉"),
        ("亥", "亥"),
    ]
    # 支刑 (地支)
    shikei = [
        ("子", "卯"),
        ("寅", "巳"),
        ("巳", "申"),
        ("申", "寅"),
        ("丑", "戌"),
        ("戌", "未"),
        ("未", "丑"),
    ]
    def check(self, element_1, element_2,type):
        shi_pair = {element_1, element_2}
        check = self.chichu
        if type == "干冲": check = self.kanchu
        if type == "干剋": check = self.kanka
        if type == "暗合": check = self.shi_angou
        if type == "支冲": check = self.chichu
        if type == "支害": check = self.shigai
        if type == "支破": check = self.shiha
        if type == "支刑": check = self.shikei
        if type == "自刑": check = self.shijikei

        # Check against each 七冲 pair in the list
        for pair in check:
            if set(pair) == shi_pair:
                return True

        # If no match is found, return False
        return False

    def check_shigou(self, shi_1,shi_2):
        shi_pair = {shi_1, shi_2}
        for pair in self.shigou:
            if set(pair[:2]) == shi_pair:
                return pair[2]
        return None
    def check_kangou(self, kan_1, kan_2):
        kan_pair = {kan_1, kan_2}
        for pair in self.kangou:
            # Here, pair[0] and pair[1] are the elements to compare, and pair[2] is the element to return
            if set(pair[:2]) == kan_pair:
                return pair[2]
        return None
    def __init__(self, meishiki):
        self.meishiki = meishiki
        # 日元
        self.higen = meishiki["kan"][2]["element"]
        # 月令
        self.tsukiren = meishiki["shi"][1]["element"]

        self.gouka = {
            "kan": [],
            "shi": []
        }

        # 天干分析
        for i in range(len(meishiki["kan"])):
            kan_1 = meishiki["kan"][i]["element"]
            for j in range(i + 1, len(meishiki["kan"])):
                kan_2 = meishiki["kan"][j]["element"]
                # 天干合化
                result = self.check_kangou(kan_1, kan_2)
                if result: self.gouka["kan"].append({
                        "type":"合化",
                        "element": [kan_1,kan_2],
                        "to": result,
                        "index": [i,j]
                })
                # 天干相冲
                kanchu = self.check(kan_1, kan_2, "干冲")
                if kanchu: self.gouka["kan"].append({
                        "type": "干冲",
                        "element": [kan_1, kan_2],
                        "to": None,
                        "index": [i, j]
                    })
                # 天干相剋
                kanka = self.check(kan_1, kan_2, "干剋")
                if kanka: self.gouka["kan"].append({
                    "type": "干剋",
                    "element": [kan_1, kan_2],
                    "to": None,
                    "index": [i, j]
                })
        # 地支分析
        for i in range(len(meishiki["shi"])):
            shi_1 = meishiki["shi"][i]["element"]
            for j in range(i + 1, len(meishiki["shi"])):
                shi_2 = meishiki["shi"][j]["element"]
                # 地支三和
                result = self.check_shigou(shi_1, shi_2)
                if result: self.gouka["shi"].append({
                    "type": "合化",
                    "element": [shi_1, shi_2],
                    "to": result,
                    "index": [i, j]
                })
                # 地支暗合
                shi_anka = self.check(shi_1, shi_2, "暗合")
                if shi_anka: self.gouka["shi"].append({
                    "type": "暗合",
                    "element": [shi_1, shi_2],
                    "to": None,
                    "index": [i, j]
                })
                # 地支支冲
                shi_chong = self.check(shi_1, shi_2, "支冲")
                if shi_chong: self.gouka["shi"].append({
                    "type": "支冲",
                    "element": [shi_1, shi_2],
                    "to": None,
                    "index": [i, j]
                })
                zhihai = self.check(shi_1, shi_2, "支害")
                if zhihai: self.gouka["shi"].append({
                    "type": "支害",
                    "element": [shi_1, shi_2],
                    "to": None,
                    "index": [i, j]
                })
                zhipo = self.check(shi_1, shi_2, "支破")
                if zhipo: self.gouka["shi"].append({
                    "type": "支破",
                    "element": [shi_1, shi_2],
                    "to": None,
                    "index": [i, j]
                })
                zhixing = self.check(shi_1, shi_2, "支刑")
                if zhixing: self.gouka["shi"].append({
                    "type": "支刑",
                    "element": [shi_1, shi_2],
                    "to": None,
                    "index": [i, j]
                })
                zhixin = self.check(shi_1, shi_2, "自刑")
                if zhixin: self.gouka["shi"].append({
                    "type": "自刑",
                    "element": [shi_1, shi_2],
                    "to": None,
                    "index": [i, j]
                })

        print(self.gouka)
