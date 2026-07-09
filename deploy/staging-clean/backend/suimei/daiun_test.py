from meishiki import Meishi
from utils.helper import *
import datetime
import matplotlib.pyplot as plt
import matplotlib
import numpy
matplotlib.rc('font', family='BIZ UDGothic')


def plot_daiun_overall(m :Meishi):
    # 原局五行
    meishiki_elements = m.element_energy["element_number"]
    element_types = ["木", "火", "土", "金", "水"]

    n_years = len(m.daiunList["kan"])
    trend = {etype: [] for etype in element_types}

    for i in range(n_years):
        counts = {etype: 0 for etype in element_types}
        for element in m.daiunList["kan"][i]["element"]:
            etype = get_kan_element_type(element)
            counts[etype] += 1
        for element in m.daiunList["shi"][i]["element"]:
            etype = get_shi_element_type(element)
            counts[etype] += 1
        for etype in element_types:
            total = meishiki_elements[etype] + counts[etype]
            trend[etype].append(total)

    years = list(range(1, n_years + 1))

    colors = {
        "木": "green",
        "火": "red",
        "土": "saddlebrown",
        "金": "orange",
        "水": "blue"
    }

    fig, axs = plt.subplots(nrows=5, ncols=1, figsize=(10, 10), sharex=True)
    for i, etype in enumerate(element_types):
        axs[i].plot(years, trend[etype], marker='o', color=colors[etype])
        tsuhen = m.element_energy["relation"][etype]
        axs[i].set_title(f"{etype}({tsuhen})")
        axs[i].set_ylabel("エネルギー")
        axs[i].set_ylim(0, 5)
        axs[i].grid(True)
    axs[-1].set_xlabel("大運")
    plt.xticks(range(0, 11))
    plt.tight_layout()
    plt.show()


def compute_daiun_with_ryuren(m):
    # 原局五行
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

    print("流年趋势:", trend)
    return trend

def plot_gyou_trends(trend, gyou):
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

    x_daiyun = list(range(1, n_years + 1))
    x_liunian = list(range(1, len(liunian_diff) + 1))
    x_mingyun = list(range(1, len(mingyun_vals) + 1))

    all_vals = daiyun_vals + liunian_diff + mingyun_vals
    global_min, global_max = min(all_vals), max(all_vals)
    if global_min == global_max:
        global_min -= 1
        global_max += 1

    fig, axes = plt.subplots(3, 1, figsize=(20, 8), sharey=True)
    tsuhen = m.element_energy["relation"][gyou]

    print(mingyun_vals)
    # (1) 大运线
    axes[0].plot(x_daiyun, daiyun_vals, marker='o')
    axes[0].set_title(f"{gyou}:{tsuhen} (大運線)")
    axes[0].set_xlabel("大運線")
    axes[0].set_ylabel("エネルギー値")
    axes[0].set_xticks(x_daiyun)
    axes[0].set_ylim(global_min, global_max+2)

    # (2) 流年线
    axes[1].plot(x_liunian, liunian_diff, marker='o')
    axes[1].set_title(f"{gyou} 流年線（増分）")
    axes[1].set_xlabel("歳")
    axes[1].set_ylabel("流年増分")
    axes[1].set_xticks(x_liunian)
    axes[1].set_ylim(global_min, global_max+2)

    # (3) 命運线
    axes[2].plot(x_mingyun, mingyun_vals, marker='o')
    axes[2].set_title(f"{gyou} 命運線（大運＋流年合算）")
    axes[2].set_xlabel("歳")
    axes[2].set_ylabel("合計エネルギー")
    axes[2].set_xticks(x_mingyun)
    axes[2].set_ylim(global_min, global_max+2)

    plt.tight_layout()
    plt.show()

if __name__ == '__main__':
    date = datetime.datetime(1997, 2, 7, 9, 48)
    # Hanyu
    #date = datetime.datetime(1998, 8, 6, 16, 41)
    m = Meishi(date,gender=1)

    #plot_daiun_overall(m)

    trend= compute_daiun_with_ryuren(m)
    plot_gyou_trends(trend,"金")
    plot_gyou_trends(trend,"木")
    plot_gyou_trends(trend,"水")
    plot_gyou_trends(trend,"火")
    plot_gyou_trends(trend,"土")