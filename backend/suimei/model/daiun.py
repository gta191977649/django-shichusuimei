from ..utils.helper import *

class Daiun:
    def __init__(self,m):
        self.meishi = m
        # 计算原局大运(根据五行)
        self.daiun = self.computeDaiunTrend()
        self.suiun = {
            "木": self.computeSuiunTrend(self.daiun,"木"),
            "火": self.computeSuiunTrend(self.daiun,"火"),
            "土": self.computeSuiunTrend(self.daiun,"土"),
            "金": self.computeSuiunTrend(self.daiun,"金"),
            "水": self.computeSuiunTrend(self.daiun,"水"),
        }


    # 大运线计算
    def computeDaiunTrend(self):
        # 原局五行
        m = self.meishi
        meishiki_elements = m.element_energy["element_number"]
        element_types = ["木", "火", "土", "金", "水"]

        n_years = len(m.daiunList["kan"])
        # 初始化trend，每个五行有"大运"和"流年"两个列表
        trend = {etype: {"daiyun": [], "ryuren": []} for etype in element_types}

        # 计算大运：每个大运能量 = 原局基础能量 + 天干、地支出现次数
        for i in range(n_years):
            counts = {etype: 0 for etype in element_types}
            # 统计天干
            for element in m.daiunList["kan"][i]["element"]:
                etype = get_kan_element_type(element)
                counts[etype] += 1
            # 统计地支
            for element in m.daiunList["shi"][i]["element"]:
                etype = get_shi_element_type(element)
                counts[etype] += 1  # Todo: 是否考虑地支藏干

            for etype in element_types:
                total = meishiki_elements[etype] + counts[etype]
                trend[etype]["daiyun"].append(total)
        print("大运趋势:", trend)

        # 计算流年能量趋势：每个大运组对应10个流年数据，总共形成10x10的矩阵
        # 假设 m.yearList 是长度为10的列表，每个元素包含 "list"（10个流年条目）
        # 初始化每个五行的流年列表为10个空列表
        for etype in element_types:
            trend[etype]["ryuren"] = [[] for _ in range(len(m.yearList))]

        # 遍历每个大运组（流年组）
        for group_idx, ryuren_group in enumerate(m.yearList):
            # 对于组内每个流年条目，计算每个五行能量
            for year_entry in ryuren_group["list"]:
                # 每个流年初始能量为对应大运的基础能量
                flow_energy = {etype: trend[etype]["daiyun"][group_idx] for etype in element_types}
                # 天干贡献
                kan_element = year_entry["kan"]["element"]
                etype_kan = get_kan_element_type(kan_element)
                flow_energy[etype_kan] += 1
                # 地支贡献
                shi_element = year_entry["shi"]["element"]
                etype_shi = get_shi_element_type(shi_element)
                flow_energy[etype_shi] += 1

                # 将计算结果分别存入各个五行对应的流年列表中
                for etype in element_types:
                    trend[etype]["ryuren"][group_idx].append(flow_energy[etype])

        #print("流年趋势:", trend)
        return trend
    # 岁运势线计算(根据大运+流年叠加)
    def computeSuiunTrend(self,trend,gyou):
        """
            trend: 经过计算后得到的trend字典
            gyou: 需要绘制的五行元素，如 '木'、'火'、'土'、'金'、'水'

            本函数将分别绘制:
            1) 大运线 (只考虑大运)
            2) 流年线 (在每个大运内部, 分10个流年点; 此处展示流年对大运的修正量)
            3) 命运线 (即大运+流年叠加后的总值)

            三个子图共用相同的y轴范围，并在x轴显示每个“年”单位
        """
        daiyun_vals = trend[gyou]["daiyun"]
        n_years = len(daiyun_vals)

        liunian_diff = []
        mingyun_vals = []
        for i, ryuren_group in enumerate(trend[gyou]["ryuren"]):
            base = daiyun_vals[i]
            for val in ryuren_group:
                liunian_diff.append(val - base)
                mingyun_vals.append(val)

        # x_daiyun = list(range(1, n_years + 1))
        # x_liunian = list(range(1, len(liunian_diff) + 1))
        # x_mingyun = list(range(1, len(mingyun_vals) + 1))
        return mingyun_vals
