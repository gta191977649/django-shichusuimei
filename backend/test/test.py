import datetime
import cnlunar
import numpy as np
import pandas as pd
class Meishi:
    # 天干
    kan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', ]
    # 地支
    shi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', ]
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
    # 蔵干表
    zoukan = {
        # 初気 中気 本気
        # (春)
        "寅": ["戊", "丙", "甲"],
        "卯": ["甲", "", "乙"],
        "辰": ["癸", "乙", "戊"],
        # (夏)
        "巳": ["戊", "庚", "丙"],
        "午": ["丙", "己", "丁"],
        "未": ["丁", "乙", "己"],
        # (秋)
        "申": ["戊", "壬", "庚"],
        "酉": ["庚", "", "辛"],
        "戌": ["辛", "丁", "戊"],
        # (冬)
        "亥": ["戊", "甲", "壬"],
        "子": ["壬", "", "癸"],
        "丑": ["癸", "辛", "己"],
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
    JuniunTable = ["长生", "沐浴", "冠带", "建禄", "帝旺", "衰", "病", "死", "墓", "绝", "胎", "养"]
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
        ["卯", "寅", "丑", "子", "亥", "戌", "酉", "申", "未", "午", "巳", "辰"]   # 癸
    ]
    #身汪身弱判断
    def getJuniunboshi(self,kan,shi):
        kan_idx = Meishi.kan.index(kan)
        unboshi_idx = Meishi.JuniunboshiMatrix[kan_idx].index(shi)
        unboshi = Meishi.JuniunTable[unboshi_idx]
        return unboshi
    def miouChiyakuCheck(self):
        print(f"身汪弱検定:")
        print(f"日元:「{self.higen}」月令:「{self.chishi[1]}」")
        # 日元
        higen_idx = Meishi.kan.index(self.higen)
        # 月令
        tsukirei_idx = Meishi.shi.index(self.chishi[1])
        # 月令点分析
        print(f"日主は「{Meishi.season[Meishi.season_shi[tsukirei_idx]]}」に生まれの「{Meishi.gogyo[Meishi.gogyo_kan[higen_idx]]}」です")
        tsukirei_point = Meishi.TsukireiPointMatrix[higen_idx][tsukirei_idx]
        print(f"１.月令点: {tsukirei_point}")
        # 五行点分析
        # 五行数 ('木', '火', '土', '金', '水') の順番
        five_elements_number = [0,0,0,0,0]
        for idx,ele in enumerate(self.tenkan): # 天干五行数
            gogyu_kan_idx = Meishi.gogyo_kan[Meishi.kan.index(ele)]
            five_elements_number[gogyu_kan_idx] += 1

        for idx,ele in enumerate(self.chishi): # 地支五行数
            gogyu_shi_idx = Meishi.gogyo_shi[Meishi.shi.index(ele)]
            five_elements_number[gogyu_shi_idx] += 1
        out = ""
        for idx,number in enumerate(five_elements_number):
            out += f"{Meishi.gogyo[idx]}:{number} "
        print(f"２.五行数: {out}")
        higen_element = Meishi.gogyo[Meishi.gogyo_kan[higen_idx]]
        print(f"生剋関係: {Meishi.gogyo_seikei[higen_element]}")
        # 五行点計算,ルール： 自星：（﹢）印星：（﹢）官星：（﹣）财星：（﹣）泄星：（﹣）
        seikei_rule = {"自星":1,"印星":1,"官星":-1,"財星":-1,"泄星":-1}
        gogyu_point = 0
        # 得点計算:
        print(f"五行\t関係\t五行数\tサイン")
        for type in Meishi.gogyo_seikei[higen_element]:
            element_name = Meishi.gogyo_seikei[higen_element][type]
            element_idx = Meishi.gogyo.index(element_name)
            sign = seikei_rule[type]
            n_of_element = five_elements_number[element_idx]
            print(f"{element_name}\t{type}\t{n_of_element}\t{sign}")
            gogyu_point += sign * n_of_element

        print(f"２.五行数得点:{gogyu_point}")
        total = gogyu_point + tsukirei_point
        shin_type = ""
        if total >=3: shin_type = "身汪"
        if total >=0 and total < 3: shin_type = "中和"
        else: shin_type = "身弱"
        print(f"３.十二星運星点：N/A")
        print(f"合計:{total}点「{shin_type}」")



    def __init__(self,birthdate,gender=None):
        data = cnlunar.Lunar(birthdate, godType='8char')
        # 天干
        self.tenkan = [data.year8Char[0], data.month8Char[0], data.day8Char[0], data.twohour8Char[0]]
        # 地支
        self.chishi = [data.year8Char[1], data.month8Char[1], data.day8Char[1], data.twohour8Char[1]]
        self.zoukan = []
        for i,element in enumerate(self.chishi):
            self.zoukan.append(Meishi.zoukan[element])
        # 日元
        self.higen = data.day8Char[0]
        # 十神（天干）通変星に求めて
        self.junshi = []
        # 地支（蔵干）通変星に求めて
        for i,element in enumerate(self.tenkan):
            element_idx = Meishi.kan.index(element)
            higen_idx = Meishi.kan.index(self.higen)
            junshi = Meishi.kan_tsuhen[higen_idx].index(element_idx)
            if not i == 2:
                self.junshi.append(Meishi.tsuhen[junshi])
            else:
                self.junshi.append("日元")

        # 十二運星に求めて
        self.juniunshi = []
        for i,element in enumerate(self.chishi):
            # 1. 十二運星早見表（59ページ参照）を用いて求めます
            # 2. 日干をもとにして、それぞれの地支をみて求めます
            unsei = self.getJuniunboshi(self.higen,element)
            self.juniunshi.append(unsei)


if __name__ == '__main__':
    date = datetime.datetime(1997, 2, 7, 9, 47)
    meishi = Meishi(date)
    # print("十神:", meishi.junshi)
    # print("天干:",meishi.tenkan)
    # print("地支:",meishi.chishi)
    # print("蔵干:",meishi.zoukan)
    print(date)
    out = ""
    for shi in meishi.junshi:
        out += f"\t{str(shi)}\t"
    print(out)
    out = ""
    for elem in meishi.tenkan:
        out += f"\t{str(elem)}\t"
    print(out)
    out = ""
    for elem in meishi.chishi:
        out += f"\t{str(elem)}\t"
    print(out)


    out = "蔵干"
    for elem in meishi.zoukan:
        out += f"\t{str(elem[-1])}\t"
    print(out)
    out = ""
    for elem in meishi.zoukan:
        out += f"\t{str(elem[-2])}\t"
    print(out)
    out = ""
    for elem in meishi.zoukan:
        out += f"\t{str(elem[-3])}\t"
    print(out)

    meishi.miouChiyakuCheck()
