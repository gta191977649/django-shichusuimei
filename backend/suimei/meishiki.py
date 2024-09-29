import datetime
import cnlunar
import math
import numpy as np
def trans(M):
    return [[M[j][i] for j in range(len(M))] for i in range(len(M[0]))]
class Meishi:
    # 天干
    kan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', ]
    # 地支
    shi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', ]
    # 天干陰陽対応 (陽：甲、丙、戊、庚、壬 ｜ 陰：乙、丁、己、辛、癸） 陽：1、陰：0
    kan_onmyo = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    # 地支陰陽対応 (陽：子、寅、辰、午、申、戌 ｜ 陰：丑、卯、巳、未、酉、亥) 陽：1、陰：0
    shi_onmyo = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
    # 十神
    tsuhen = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '偏官', '正官', '偏印', '印綬', ]
    # 五行 ㊎㊍㊌㊋㊏
    gogyo = ['木', '火', '土', '金', '水', ]
    # 五行生剋関係
    gogyo_seikei = {
        "木": {
            "自星": "木",  # 自身
            "印星": "水",  # 生我（印星）
            "泄星": "火",  # 我生（泄星）
            "官星": "金",  # 克我（官星）
            "財星": "土",  # 我剋（财星）
        },
        "火": {
            "自星": "火",
            "印星": "木",
            "泄星": "土",  # 修正：火生土
            "官星": "水",
            "財星": "金",  # 修正：火剋金
        },
        "土": {
            "自星": "土",
            "印星": "火",
            "泄星": "金",  # 修正：土生金
            "官星": "木",
            "財星": "水",  # 修正：土剋水
        },
        "金": {
            "自星": "金",
            "印星": "土",
            "泄星": "水",
            "官星": "火",
            "財星": "木",
        },
        "水": {
            "自星": "水",
            "印星": "金",
            "泄星": "木",
            "官星": "土",
            "財星": "火",
        },
    }

    # 天干五行対応
    gogyo_kan = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, ]
    # 地支五行対応
    gogyo_shi = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4, ]
    # 季節
    season = ['春', '夏', '土', '秋', '冬', ]
    # 天干季節対応
    season_kan = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, ]
    # 地支季節対応
    season_shi = [4, 4, 0, 0, 0, 1, 1, 1, 3, 3, 3, 4, ]
    # 通变星表
    kan_tsuhen = [
        # 甲,乙 ,丙,丁,戊,己,庚,辛,壬,癸
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ],  # 甲
        [1, 0, 3, 2, 5, 4, 7, 6, 9, 8, ],  # 乙
        [2, 3, 4, 5, 6, 7, 8, 9, 0, 1, ],  # 丙
        [3, 2, 5, 4, 7, 6, 9, 8, 1, 0, ],  # 丁
        [4, 5, 6, 7, 8, 9, 0, 1, 2, 3, ],  # 戊
        [5, 4, 7, 6, 9, 8, 1, 0, 3, 2, ],  # 己
        [6, 7, 8, 9, 0, 1, 2, 3, 4, 5, ],  # 庚
        [7, 6, 9, 8, 1, 0, 3, 2, 5, 4, ],  # 辛
        [8, 9, 0, 1, 2, 3, 4, 5, 6, 7, ],  # 壬
        [9, 8, 1, 0, 3, 2, 5, 4, 7, 6, ],  # 癸
    ]
    # 蔵干 (阿部泰山式)
    zoukan = {
        # 初気 中気 本気
        # (春)
        "寅": ["戊", "丙", "甲"],
        "卯": ["", "", "乙"],
        "辰": ["癸", "乙", "戊"],
        # (夏)
        "巳": ["戊", "庚", "丙"],
        "午": ["", "己", "丁"],
        "未": ["丁", "乙", "己"],
        # (秋)
        "申": ["戊", "壬", "庚"],
        "酉": ["", "", "辛"],
        "戌": ["辛", "丁", "戊"],
        # (冬)
        "亥": ["甲", "", "壬"],
        "子": ["", "", "癸"],
        "丑": ["癸", "辛", "己"],
    }
    # 六十甲子空亡表
    KuBouTable = {
      "戌亥": ["甲子","乙丑","丙寅","丁卯","戊辰","己巳","庚午","辛未","壬申","癸酉"],
      "申酉": ["甲戌","乙亥","丙子","丁丑","戊寅","己卯","庚辰","辛巳","壬午","癸未"],
      "午末": ["甲申","乙酉","丙戌","丁亥","戊子","己丑","庚寅","辛卯","壬辰","癸巳"],
      "辰巳": ["甲午","乙未","丙申","丁酉","戊戌","己亥","庚子","辛丑","壬寅","癸卯"],
      "寅卯": ["甲辰","乙巳","丙午","丁未","戊申","己酉","庚戌","辛亥","壬子","癸丑"],
      "子丑": ["甲寅","乙卯","丙辰","丁巳","戊午","己未","庚申","辛酉","壬戌","癸亥"]
    }
    # 月令点表 (決定版 四柱推命学の完全独習 - 三木照山 p.96)
    TsukireiPointMatrix = [
        # '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'
        [1, 1, 3, 3, 2, 1, 1, 1, 0, 0, 0, 1],  # 甲
        [1, 1, 3, 3, 2, 1, 1, 1, 0, 0, 0, 1],  # 乙
        [0, 0, 1, 1, 1, 3, 3, 2, 0, 0, 1, 0],  # 丙
        [0, 0, 1, 1, 1, 3, 3, 2, 0, 0, 1, 0],  # 丁
        [0, 2, 0, 0, 2, 3, 3, 2, 0, 0, 2, 0],  # 戊
        [0, 2, 0, 0, 2, 3, 3, 2, 0, 0, 2, 0],  # 己
        [1, 1, 0, 0, 0, 0, 0, 1, 3, 3, 2, 1],  # 庚
        [1, 1, 0, 0, 0, 0, 0, 1, 3, 3, 2, 1],  # 辛
        [3, 2, 1, 1, 1, 0, 0, 0, 1, 1, 1, 3],  # 壬
        [3, 2, 1, 1, 1, 0, 0, 0, 1, 1, 1, 3],  # 癸

    ]
    # 十二運エネルギー表
    JuniunTable = ["長生", "沐浴", "冠帯", "建禄", "帝旺", "衰", "病", "死", "墓", "絶", "胎", "養"]
    # 十二運星点表 (参造三木照山 p.100)
    JuniunPointTable = {
        "長生":1,
        "冠帯":1,
        "帝旺":2,
        "建禄":2,
        "沐浴":0,
        "墓":0,
        "胎":0,
        "養":0,
        "衰":0,
        "死":0,
        "病":0,
        "絶":0,
    }
    # 十二運星表
    JuniunboshiMatrix = [
        # 长生 沐浴 冠带 建禄 帝旺 衰 病 死 墓 绝 胎 养
        ["亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌"],  # 甲
        ["午", "巳", "辰", "卯", "寅", "丑", "子", "亥", "戌", "酉", "申", "未"],  # 乙
        ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"],  # 丙
        ["酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑", "子", "亥", "戌"],  # 丁
        ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"],  # 戊
        ["酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑", "子", "亥", "戌"],  # 己
        ["巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰"],  # 庚
        ["子", "亥", "戌", "酉", "申", "未", "午", "巳", "辰", "卯", "寅", "丑"],  # 辛
        ["申", "酉", "戌", "亥", "子", "丑", "寅", "卯", "辰", "巳", "午", "未"],  # 壬
        ["卯", "寅", "丑", "子", "亥", "戌", "酉", "申", "未", "午", "巳", "辰"]  # 癸
    ]

    # 干合 (天干)
    kangou = {
        "土": ["甲", "己"],
        "金": ["乙", "庚"],
        "水": ["丙", "辛"],
        "木": ["丁", "壬"],
        "火": ["戊", "癸"],
    }
    # 支合 (地支)
    shigou = {
        "土": ["子", "丑"],
        "金": ["辰", "酉"],
        "水": ["申", "巳"],
        "木": ["寅", "亥"],
        "火": ["午", "未"],
    }
    # 七冲 (地支)
    chichu = [
        ["午", "子"],
        ["未", "丑"],
        ["申", "寅"],
        ["酉", "卯"],
        ["戌", "辰"],
        ["亥", "巳"],
    ]

    def check_six_ka(self,tsuhen):
        #'比肩', '劫財'
        six_ka = {
            "官": ['偏官', '正官'],
            "印": ['偏印', '印綬'],
            "財": ['偏財', '正財'],
            "食": ['食神'],
            "傷": ['傷官'],
            "食": ['食神'],
            "比肩": ['比肩'],
            "劫財": ['劫財'],
        }

        for key, values in six_ka.items():
            if tsuhen in values:
                return key
        return None

    def get_kan_element_type(self,kan):
        kan_idx = Meishi.kan.index(kan)
        gogyo_idx = Meishi.gogyo_kan[kan_idx]
        return Meishi.gogyo[gogyo_idx]
    def check_chichu(self, shi_1, shi_2):
        # Create a set of the input 地支
        shi_pair = {shi_1, shi_2}

        # Check against each 七冲 pair in the list
        for pair in self.chichu:
            if set(pair) == shi_pair:
                return True

        # If no match is found, return False
        return False
    def check_kangou(self, kan_1, kan_2):
        shi_pair = {kan_1, kan_2}
        for element, pair in self.kangou.items():
            if set(pair) == shi_pair:
                return element
        return None

    def check_shigou(self, shi_1, shi_2):
        shi_pair = {shi_1, shi_2}
        for element, pair in self.shigou.items():
            if set(pair) == shi_pair:
                return element
        return None
    # 蔵干に取って
    def getZoukan(self,element):
        return Meishi.zoukan[element]
    def getTwelveFestivalsForBirthYear(self):
        # 立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒 二十四節気の「節」です
        setsu_terms = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]
        dates = {term: date for term, date in self.date.thisYearSolarTermsDic.items() if term in setsu_terms}
        return dates
    # イベン計算(流年)
    def getEvent(self,kan,shi,type="relationship"):
        event_list = []
        relastioship_element = self.chishi[2]
        if type == "relationship":
            # 男命遇财星，女命遇官杀
            kan_tsuhen = kan["tsuhen"]
            shi_tsuhen = shi["tsuhen"]
            if self.gender == 1:
                # 财星情况
                if kan_tsuhen == "偏財" or kan_tsuhen == "正財":
                    event_list.append({
                        "name": f"恋愛機会可能「{kan_tsuhen}」" ,
                        "description": ""
                    })
                if shi_tsuhen == "偏財" or shi_tsuhen == "正財":
                    event_list.append({
                        "name": f"恋愛機会可能「{shi_tsuhen}」",
                        "description": ""
                    })
                # 夫妻宫引动情况 (自刑(同)，合，冲，刑)
                # 干合
                if self.check_kangou(self.higen, kan["element"]):
                    event_list.append({
                        "name": "恋愛機会可能「干合」",
                        "description": ""
                    }) # 支合
                if self.check_shigou(relastioship_element, shi["element"]):
                    event_list.append({
                        "name": "恋愛機会可能「支合」",
                        "description": ""
                    })
                # 自刑
                if relastioship_element == shi["element"]:
                    event_list.append({
                        "name": "感情紛争注意「自刑」",
                        "description": ""
                    })
                # 支沖
                if self.check_chichu(relastioship_element, shi["element"]):
                    event_list.append({
                        "name": "感情変化注意「支沖」",
                        "description": ""
                    })
            if self.gender == 0:
                if kan_tsuhen == "正官" or kan_tsuhen == "偏官":
                    event_list.append({
                        "name": f"恋愛機会可能「{kan_tsuhen}」",
                        "description": ""
                    })
        return event_list

    # 大運計算
    def getDaiunList(self, unjun_type, unjun_step=11):
        # 1. 月柱の干支を取得
        getsu_kan = self.tenkan[1]
        getsu_shi = self.chishi[1]

        daiun_kan = []
        daiun_shi = []

        # 2. 逆順運と順行運の判断
        if unjun_type == 1:  # 順行運
            # 干の計算
            start_kan_idx = Meishi.kan.index(getsu_kan)
            for i in range(1,unjun_step+1):
                idx = (start_kan_idx + i) % 10  # 10で割った余りを使用
                daiun_kan.append(Meishi.kan[idx])

            # 支の計算
            start_shi_idx = Meishi.shi.index(getsu_shi)
            for i in range(1,unjun_step+1):
                idx = (start_shi_idx + i) % 12  # 12で割った余りを使用
                daiun_shi.append(Meishi.shi[idx])

        else:  # 逆行運
            # 干の計算
            start_kan_idx = Meishi.kan.index(getsu_kan)
            for i in range(1,unjun_step+1):
                idx = (start_kan_idx - i) % 10  # 10で割った余りを使用
                daiun_kan.append(Meishi.kan[idx])

            # 支の計算
            start_shi_idx = Meishi.shi.index(getsu_shi)
            for i in range(1,unjun_step+1):
                idx = (start_shi_idx - i) % 12  # 12で割った余りを使用
                daiun_shi.append(Meishi.shi[idx])

        # 大運の干支を組み合わせる
        #daiun_kanshi = [f"{kan}{shi}" for kan, shi in zip(daiun_kan, daiun_shi)]
        daiun_kanshi = {
            "kan":[],
            "shi":[]
        }
        higen_idx = Meishi.kan.index(self.higen)
        # 干
        for element in daiun_kan:
            element_idx = Meishi.kan.index(element)
            junshi_idx = Meishi.kan_tsuhen[higen_idx].index(element_idx)
            daiun_kanshi["kan"].append({
                "element": element,
                "tsuhen": Meishi.tsuhen[junshi_idx],
                "seiun": "-", #星運
                "relation": {
                    "year": {
                        "干合": self.check_kangou(self.tenkan[0], element),
                    },
                    "month":{
                        "干合": self.check_kangou(self.tenkan[1], element),
                    },
                    "day": {
                        "干合":self.check_kangou(self.tenkan[2], element),
                    },
                    "time":{
                        "干合":self.check_kangou(self.tenkan[3], element),
                    }
                }
            })
        #print(daiun_kanshi)

        # 支の方は、蔵干と通変星の関係に分析
        print("-------")
        for element in daiun_shi:
            shi_zoukan = self.getZoukan(element)
            zoukan_junshi = []
            for zoukan in shi_zoukan:
                if zoukan: #蔵干はなしの場所にあり
                    element_idx = Meishi.kan.index(zoukan)
                    junshi_idx = Meishi.kan_tsuhen[higen_idx].index(element_idx)
                    zoukan_junshi.append({
                        "element": zoukan,
                        "tsuhen":Meishi.tsuhen[junshi_idx],
                    })
                else:
                    zoukan_junshi.append("")
            #大運星運求めて
            daiun_kanshi["shi"].append({
                "element": element,
                "zoukan": zoukan_junshi,
                "seiun":  self.getJuniunboshi(self.higen,element), # 大運星運の方、日干と大運の地支に求めて
                "relation": { # 刑･冲･合
                    "year":{
                        "支合": self.check_shigou(self.chishi[0],element),
                        "七冲": self.check_chichu(self.chishi[0],element),
                    },
                    "month": {
                        "支合": self.check_shigou(self.chishi[1], element),
                        "七冲": self.check_chichu(self.chishi[1], element),
                    },
                    "day": {
                        "支合": self.check_shigou(self.chishi[2], element),
                        "七冲": self.check_chichu(self.chishi[2], element),
                    },
                    "time": {
                        "支合": self.check_shigou(self.chishi[3], element),
                        "七冲": self.check_chichu(self.chishi[3], element),
                    },
                }
            })


        return daiun_kanshi
    # 年運計算
    def getYearList(self,unjun_step=11):
        # 立運時間に取って
        # self.ritsun = {
        #     "unjun_type": unjun_type,
        #     "year": y,
        #     "month": m,
        #     "note": ritsuun_note,
        #     "unjun_type": unjun_type,  # 運行順：１順行、２逆行
        # }
        year = self.ritsun["year"]
        month = self.ritsun["month"]
        higen_idx = Meishi.kan.index(self.higen)
        year = (self.birthdate.year + year) + 1 if month > 4 else (self.birthdate.year + year)
        # 年間推算（立運時始まる）
        year_list = []

        for i in range(unjun_step):
            daiun_time = i * 10
            yearlist = []
            for j in range(daiun_time,daiun_time+unjun_step-1):
                if year + j < 2100:
                    y = cnlunar.Lunar(datetime.datetime(year + j,3,1,1,1), godType='8char')
                    kan_idx = Meishi.kan.index(y.year8Char[0])
                    kan_idx_tsuhen_idx = Meishi.kan_tsuhen[higen_idx].index(kan_idx)
                    # 蔵干
                    shi_zoukan = self.getZoukan(y.year8Char[1])
                    zoukan_junshi = []
                    for zoukan in shi_zoukan:
                        if zoukan:  # 蔵干はなしの場所にあり
                            element_idx = Meishi.kan.index(zoukan)
                            junshi_idx = Meishi.kan_tsuhen[higen_idx].index(element_idx)
                            zoukan_junshi.append({
                                "element": zoukan,
                                "tsuhen": Meishi.tsuhen[junshi_idx],
                            })
                        else:
                            zoukan_junshi.append("")
                    kan = {
                        "element":y.year8Char[0],
                        "tsuhen":Meishi.tsuhen[kan_idx_tsuhen_idx],
                    }
                    shi = {
                        "element":y.year8Char[1],
                        "tsuhen":zoukan_junshi[-1]["tsuhen"],
                        "zoukan":zoukan_junshi,
                        "seiun": self.getJuniunboshi(self.higen, y.year8Char[1]),
                    }
                    yearlist.append({
                        "age": (j+1),
                        "year": year + j,
                        "event": {
                            "relationship": self.getEvent(kan,shi,type="relationship"),
                            "work":[],
                            "health":[],
                        },
                        "kan":kan,
                        "shi":shi

                    })
                else: break

            # List append
            year_list.append({
                "daiun": daiun_time,
                "list": yearlist
            })
        #print(year_list)
        return year_list
    # 格局分析
    def kakyokuAnlysis(self):
        output = {
            "pattern":"N/A",
            "note":""
        }
        yueling_tsuhen = self.meisiki["shi"][1]["tsuhen"]
        print(yueling_tsuhen)
        # 特別格判断
        if yueling_tsuhen == "劫財" or yueling_tsuhen == "比肩":
            output["pattern"] = "特別格局（比肩、劫財あり）".format(self.meisiki["shi"][1]["tsuhen"])
            output["note"] = "特別格局（比肩、劫財あり）"
            return output

        # 一般の方（比肩、劫財除外)
        # 1. 月柱の支に蔵干（本気）で透出（月地支透于天干）
        if self.meisiki["shi"][1]["tsuhen"] == self.meisiki["kan"][1]["tsuhen"]:
            output["pattern"] = "{}格".format(self.meisiki["shi"][1]["tsuhen"])
            output["note"] = "月柱の支に蔵干（本気）で透出（月地支透于天干）"
            return output
        # 2. 月柱の支に蔵干（本気以外の気）で透出（月地支未透天干，退而求其次）
        for i in range(1,len(self.meisiki["shi"][1]["zoukan"])):
            if self.meisiki["shi"][1]["zoukan"][i]["tsuhen"] == self.meisiki["kan"][1]["tsuhen"]:
                output["pattern"] = "{}格".format(self.meisiki["shi"][1]["zoukan"][i]["tsuhen"])
                output["note"] = "2. 月柱の支に蔵干（本気以外の気）で透出（月地支未透天干，退而求其次）"
                return output

        # 3. 月柱未透月天干、でも月柱以外の柱て透出の方 （見方１のみ）
        found = []
        for j in range(len(self.meisiki["kan"])):
            if j == 2: continue  # 日元SKIP
            if self.meisiki["shi"][1]["tsuhen"] == self.meisiki["kan"][j]["tsuhen"]:
                found.append("{}格".format(yueling_tsuhen))
        if len(found) == 1: #（見方１のみ）
            output["pattern"] = found[0]
            output["note"] = "3. 月柱未透月天干、でも月柱以外の柱て透出。"
            return output

        # 4. 月柱蔵干全て未透（月柱と他の支未透）、月柱の蔵干全てと全体的柱に探す、そしてルール３で适用。
        found = []
        for i in range( len(self.meisiki["shi"][1]["zoukan"])):
            yueling_tsuhen = self.meisiki["shi"][1]["zoukan"][i]["tsuhen"]
            for j in range(len(self.meisiki["kan"])):
                if j == 2: continue # 日元SKIP
                if yueling_tsuhen == self.meisiki["kan"][j]["tsuhen"]:
                    found.append("{}格".format(yueling_tsuhen))
        if len(found) == 1: #（見方１のみ）
            output["pattern"] = found[0]
            output["note"] = "4. 月柱蔵干全て未透（月柱と他の支未透）、月柱の蔵干全てと全体的柱に探す、そしてルール３で适用。"
            return output

        # 5. 全体天干と全体地支未透の方（六神通変星）使用: 印、財、食、傷
        found = []
        for i in range(len(self.meisiki["shi"][1]["zoukan"])):
            tsuhen = self.meisiki["shi"][1]["zoukan"][i]["tsuhen"]
            for j in range(len(self.meisiki["kan"])):
                if j == 2: continue  # 日元SKIP
                a = self.check_six_ka(tsuhen)
                b = self.check_six_ka(self.meisiki["kan"][j]["tsuhen"])
                if a == b:
                    found.append("虚透{}格".format(tsuhen))

        if len(found) == 1: #（見方１のみ）
            output["pattern"] = found[0]
            output["note"] = "5. 全体天干と全体地支未透の方（六神通変星）使用: 印、財、食、傷"
            return output


        # 6. さもないと、月令の通変星直接に取って（比肩、劫財除外）
        output["pattern"] = "{}格".format(self.meisiki["shi"][1]["tsuhen"])
        output["note"] = "6. さもないと、月令の通変星直接に取って（比肩、劫財除外）"

        return output
    # 用神分析
    def younjinAnlysis(self):
        output = {
            "younjin": {
                "element":[],
                "tsuhen":[]
            },
            "kishin": { # 忌神
                "element": [],
                "tsuhen": []
            },
        }
        # 日主の旺衰（強弱）を判断
        shin_point = self.tsukirei_point + self.gogyu_point + self.juniun_point
        element_type = self.get_kan_element_type(self.higen)
        if shin_point > 3: # （旺）
            # 用神：日主を抑える五行（克する、泄する）。
            output["younjin"]["element"].append(self.gogyo_seikei[element_type]["泄星"])
            output["younjin"]["element"].append(self.gogyo_seikei[element_type]["官星"])
            output["younjin"]["element"].append(self.gogyo_seikei[element_type]["財星"])
            # 忌神：日主をさらに強める五行（生じる、扶ける）。
            output["kishin"]["element"].append(self.gogyo_seikei[element_type]["印星"])
            output["kishin"]["element"].append(self.gogyo_seikei[element_type]["自星"])
        else: # （弱）
            # 用神：日主を助ける五行（生じる、扶ける）。
            output["younjin"]["element"].append(self.gogyo_seikei[element_type]["自星"])
            output["younjin"]["element"].append(self.gogyo_seikei[element_type]["印星"])
            # 忌神：日主をさらに弱める五行（克する、泄する）。
            output["kishin"]["element"].append(self.gogyo_seikei[element_type]["泄星"])
            output["kishin"]["element"].append(self.gogyo_seikei[element_type]["官星"])
            output["kishin"]["element"].append(self.gogyo_seikei[element_type]["財星"])
        return output

    # 立運計算
    def getRitsunTime(self):
        output_steps = ""
        # 1. 逆順運と順行運判断
        unjun_type = 0  # 0: 逆順運 1:順行運
        gender = "男性" if self.gender == 1 else "女性"
        output_steps += f"1. 性別: {gender}\n"

        nen_kan_idx = Meishi.kan.index(self.tenkan[0])
        nen_kan_onmyo = Meishi.kan_onmyo[nen_kan_idx]
        onmyo = "陽" if nen_kan_onmyo == 1 else "陰"
        output_steps += f"2. 年干: {self.tenkan[0]}（{onmyo}）\n"

        if self.gender == 1:  # 男命
            if nen_kan_onmyo == 1:
                unjun_type = 1
                output_steps += "3. 男命で年干が陽のため、順行運を適用\n"
            else:
                unjun_type = 0
                output_steps += "3. 男命で年干が陰のため、逆行運を適用\n"
        else:  # 女命
            if nen_kan_onmyo == 1:
                unjun_type = 0
                output_steps += "3. 女命で年干が陽のため、逆行運を適用\n"
            else:
                unjun_type = 1
                output_steps += "3. 女命で年干が陰のため、順行運を適用\n"

        output_steps += f"4. 適用する運: {'順行運' if unjun_type == 1 else '逆行運'}\n"

        # 2. 立運時間推算
        all_12_festivals = self.getTwelveFestivalsForBirthYear()

        # 節気の日付をdatetimeオブジェクトに変換
        festivals = sorted([
            datetime.datetime(self.birthdate.year, month, day)
            for month, day in all_12_festivals.values()
        ])

        # 適用される節気を決定
        if unjun_type == 1:  # 順行運
            applied_festival = next(f for f in festivals if f > self.birthdate)
        else:  # 逆行運
            applied_festival = next(f for f in reversed(festivals) if f < self.birthdate)

        output_steps += "5. 出生年の節気:\n"
        output_steps += "   節気\t月\t日\n"
        for festival, (month, day) in all_12_festivals.items():
            date = datetime.datetime(self.birthdate.year, month, day)
            marker = " ○" if date == applied_festival else " ."
            output_steps += f"   {festival}\t{month}\t{day}{marker}\n"
        output_steps += "\n"

        # 日数差の計算
        if unjun_type == 1:  # 順行運
            days_diff = (applied_festival - self.birthdate).days
            output_steps += f"6. 順行運: 出生日({self.birthdate.date()})以降の最初の節 {applied_festival.date()}*\n"
        else:  # 逆行運
            days_diff = (self.birthdate - applied_festival).days
            output_steps += f"6. 逆行運: 出生日({self.birthdate.date()})以前の最後の節 {applied_festival.date()} *\n"

        output_steps += f"7. 日数差: {days_diff}日\n"

        # 3で割って立運時間を計算
        years, remainder = divmod(days_diff, 3)
        months = remainder * 4

        output_steps += f"8. 立運時間計算:\n"
        output_steps += f"   {days_diff} ÷ 3 = {years} 年 (余り {remainder})\n"
        output_steps += f"   余り {remainder} × 4 = {months} ヶ月\n"
        output_steps += f"9. 最終結果: {years}年{months}ヶ月\n"

        return years, months,unjun_type, output_steps


    def getKuBou(self,kan,shi):
        kanshi = kan+shi
        for kubou in Meishi.KuBouTable:
            if kanshi in Meishi.KuBouTable[kubou]:
                return kubou
        return "ERROR"
    def getJuniunboshi(self,kan,shi):
        kan_idx = Meishi.kan.index(kan)
        unboshi_idx = Meishi.JuniunboshiMatrix[kan_idx].index(shi)
        unboshi = Meishi.JuniunTable[unboshi_idx]
        return unboshi
    #身汪身弱判断
    def calculateElementNumber(self):
        five_elements_number = [0, 0, 0, 0, 0]
        for idx, ele in enumerate(self.tenkan):  # 天干五行数
            gogyu_kan_idx = Meishi.gogyo_kan[Meishi.kan.index(ele)]
            five_elements_number[gogyu_kan_idx] += 1

        for idx, ele in enumerate(self.chishi):  # 地支五行数
            gogyu_shi_idx = Meishi.gogyo_shi[Meishi.shi.index(ele)]
            five_elements_number[gogyu_shi_idx] += 1
        return five_elements_number

    def miouChiyakuCheck(self):
        def determine_shin_type(total):
            shin_type = ""
            if total >= 3:
                shin_type = "身旺"
            elif 0 <= total < 3:
                shin_type = "中和"
            else:
                shin_type = "身弱"
            return shin_type

        note = "身旺弱検定:\n"
        note += f"日元:「{self.higen}」月令:「{self.chishi[1]}」\n"

        # 日元と月令の分析
        higen_idx = Meishi.kan.index(self.higen)
        tsukirei_idx = Meishi.shi.index(self.chishi[1])
        note += f"日主は「{Meishi.season[Meishi.season_shi[tsukirei_idx]]}」に生まれの「{Meishi.gogyo[Meishi.gogyo_kan[higen_idx]]}」です\n"

        # 1. 月令点分析
        tsukirei_point = Meishi.TsukireiPointMatrix[higen_idx][tsukirei_idx]
        note += f"1. 月令点: {tsukirei_point}\n"

        # 2. 五行点分析
        five_elements_number = self.calculateElementNumber()
        note += "2. 五行数:\n"
        for idx, number in enumerate(five_elements_number):
            note += f"  {Meishi.gogyo[idx]}: {number}\n"

        higen_element = Meishi.gogyo[Meishi.gogyo_kan[higen_idx]]
        note += "生剋関係:\n"
        note += "関係\t五行\n"
        for relation, element in Meishi.gogyo_seikei[higen_element].items():
            note += f"{relation}:「{element}」\n"
        note += "\n"

        # 五行点計算
        seikei_rule = {"自星": 1, "印星": 1, "官星": -1, "財星": -1, "泄星": -1}
        gogyu_point = 0
        note += "五行生剋分析:\n"
        note += "五行\t関係\t五行数\t符号\t得点\n"
        for type in Meishi.gogyo_seikei[higen_element]:
            element_name = Meishi.gogyo_seikei[higen_element][type]
            element_idx = Meishi.gogyo.index(element_name)
            sign = seikei_rule[type]
            sign_kanji = "＋" if sign > 0 else "―"
            n_of_element = five_elements_number[element_idx]
            point = sign * n_of_element
            note += f"{element_name}\t{type}\t({n_of_element})\t{sign_kanji}\t{n_of_element}\n"
            gogyu_point += point

        note += f"五行数得点合計: {gogyu_point}\n\n"

        # 3. 十二運星点分析
        note += "3. 十二運星点分析:\n"
        juniun_element_points = [0] * 12
        note += "運星\t点数\n"
        for unsei in self.juniunshi:
            juniun_idx = Meishi.JuniunTable.index(unsei)
            point = Meishi.JuniunPointTable[unsei]
            juniun_element_points[juniun_idx] = point
            note += f"{unsei}\t{point}\n"

        note += "\n十二運星の計算過程:\n"
        idx_1 = Meishi.JuniunTable.index("建禄")
        idx_2 = Meishi.JuniunTable.index("帝旺")

        if juniun_element_points[idx_1] > 0 and juniun_element_points[idx_2] > 0:
            note += "「建禄」と「帝旺」が両方存在します。\n"
            other_points = [p for i, p in enumerate(juniun_element_points) if i not in [idx_1, idx_2]]
            max_other = max(other_points) if other_points else 0
            note += f"「建禄」と「帝旺」以外の最高点: {max_other}\n"
            juniun_point = max_other + 3
            note += f"最終十二運星点: {max_other} + 3 (建禄と帝旺のボーナス) = {juniun_point}\n"
        else:
            juniun_point = max(juniun_element_points)
            note += f"最高点を採用: {juniun_point}\n"

        note += f"十二運星点: {juniun_point}\n\n"

        # 合計点数と身旺弱の判定
        total = gogyu_point + tsukirei_point + juniun_point
        shin_type = determine_shin_type(total)

        note += f"最終結果:\n"
        note += f"月令点: {tsukirei_point}\n"
        note += f"五行点: {gogyu_point}\n"
        note += f"十二運星点: {juniun_point}\n"
        note += f"合計: {total}点\n"
        note += f"判定: 「{shin_type}」\n"

        return shin_type, tsukirei_point, gogyu_point, juniun_point, note


    def getKanTsuhen(self,kan):
        higen_idx = Meishi.kan.index(self.higen)
        zoukan_idx = Meishi.kan.index(kan)
        junshi = Meishi.kan_tsuhen[higen_idx].index(zoukan_idx)
        junshi = Meishi.tsuhen[junshi]
        return junshi
    def __init__(self,birthdate,gender=1):
        self.birthdate = birthdate
        self.date = cnlunar.Lunar(self.birthdate, godType='8char')
        self.gender = gender
        # 天干
        self.tenkan = [self.date.year8Char[0], self.date.month8Char[0], self.date.day8Char[0], self.date.twohour8Char[0]]
        # 地支
        self.chishi = [self.date.year8Char[1], self.date.month8Char[1], self.date.day8Char[1], self.date.twohour8Char[1]]
        self.zoukan = []
        for i,element in enumerate(self.chishi):
            self.zoukan.append(Meishi.zoukan[element])
        # 日元
        self.higen = self.date.day8Char[0]
        higen_idx = Meishi.kan.index(self.higen)
        # 十神（天干）通変星に求めて
        self.junshi = []
        higen_jushi = []
        for i,element in enumerate(self.tenkan):
            element_idx = Meishi.kan.index(element)
            junshi = Meishi.kan_tsuhen[higen_idx].index(element_idx)
            if not i == 2:
                higen_jushi.append(Meishi.tsuhen[junshi])
            else:
                higen_jushi.append("日元")
        self.junshi.append(higen_jushi)

        # # 地支（蔵干）通変星に求めて
        for k in range(3):
            a = []
            for i in range(len(self.zoukan)):
                zoukan_element = self.zoukan[i][k]
                if not zoukan_element == "":
                    zoukan_idx = Meishi.kan.index(zoukan_element)
                    junshi = Meishi.kan_tsuhen[higen_idx].index(zoukan_idx)
                    junshi = Meishi.tsuhen[junshi]
                    a.append(junshi)
                else:
                    a.append("空")
            self.junshi.append(a)
        # 十二運星に求めて
        self.juniunshi = []
        for i, element in enumerate(self.chishi):
            # 1. 十二運星早見表（59ページ参照）を用いて求めます
            # 2. 日干をもとにして、それぞれの地支をみて求めます
            unsei = self.getJuniunboshi(self.higen, element)
            self.juniunshi.append(unsei)

        self.shin_type,self.tsukirei_point,self.gogyu_point,self.juniun_point,self.shin_type_note = self.miouChiyakuCheck()
        self.five_elements_number = self.calculateElementNumber()
        # 空亡
        self.kubou = self.getKuBou(self.higen,self.chishi[2])

        self.meisiki = {
            "kan":[],
            "shi":[],
            "kubou":self.kubou,
        }
        # Merge Tenkan
        for idx,k in enumerate(self.tenkan):
            self.meisiki["kan"].append({
                "element":k,
                "tsuhen":self.junshi[0][idx],
            })
        # Merge Chishi
        for idx, c in enumerate(self.chishi):
            zoukan_elements = []
            for jdx, z in enumerate(reversed(self.zoukan[idx])):
                if z:
                    zoukan_elements.append({
                        "element":z,
                        "tsuhen":self.getKanTsuhen(z),
                    })
                else:
                    zoukan_elements.append({
                        "element": False,
                        "tsuhen": False,
                    })
            self.meisiki["shi"].append({
                "element": c,
                "tsuhen": zoukan_elements[0]["tsuhen"],
                "zoukan":zoukan_elements
            })

        # 立運時間推算
        y, m, unjun_type,ritsuun_note = self.getRitsunTime()
        self.ritsun = {
            "unjun_type":unjun_type,
            "year": y,
            "month": m,
            "note":ritsuun_note,
            "unjun_type": unjun_type, #運行順：１順行、２逆行
        }
        # 大運時間推算
        self.daiunList = self.getDaiunList(unjun_type)
        self.yearList = self.getYearList()
        # 用神
        self.younjin = self.younjinAnlysis()
        # 格局 (かっきょく)
        self.kakyoku = self.kakyokuAnlysis()
        print("OK")


if __name__ == '__main__':
    date = datetime.datetime(1997, 2, 7, 9, 25)

    meishi = Meishi(date)
    kankou = meishi.check_kangou("己","甲")
    print(kankou)
    #y,m,debug = meishi.getRitsunTime()

    # print(y,m)
    # print(debug)
    # print("十神:", meishi.junshi)
    # print("天干:",meishi.tenkan)
    # print("地支:",meishi.chishi)
    # print("蔵干:",meishi.zoukan)
    # print(date)
    # out = ""
    # for shi in meishi.junshi:
    #     out += f"\t{str(shi)}\t"
    # print(out)
    # out = ""
    # for elem in meishi.tenkan:
    #     out += f"\t{str(elem)}\t"
    # print(out)
    # out = ""
    # for elem in meishi.chishi:
    #     out += f"\t{str(elem)}\t"
    # print(out)
    #
    #
    # out = "蔵干"
    # for elem in meishi.zoukan:
    #     out += f"\t{str(elem[-1])}\t"
    # print(out)
    # out = ""
    # for elem in meishi.zoukan:
    #     out += f"\t{str(elem[-2])}\t"
    # print(out)
    # out = ""
    # for elem in meishi.zoukan:
    #     out += f"\t{str(elem[-3])}\t"
    # print(out)


