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
gogyo = ['木', '火', '土', '金', '水']
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

def get_kan_element_type(element):
    kan_idx = kan.index(element)
    gogyo_idx = gogyo_kan[kan_idx]
    return gogyo[gogyo_idx]
def get_shi_element_type(element):
    shi_idx = shi.index(element)
    gogyo_idx = gogyo_shi[shi_idx]
    return gogyo[gogyo_idx]
