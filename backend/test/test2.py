import numpy as np

labels = ['长生', '沐浴', '冠带', '建禄', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']

matrix = np.array([
    ['长生', '沐浴', '冠带', '建禄', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'],
    ['死', '墓', '绝', '胎', '养', '长生', '沐浴', '冠带', '建禄', '帝旺', '衰', '病'],
    ['胎', '养', '长生', '沐浴', '冠带', '建禄', '帝旺', '衰', '病', '死', '墓', '绝'],
    ['绝', '胎', '养', '长生', '沐浴', '冠带', '建禄', '帝旺', '衰', '病', '死', '墓'],
    ['建禄', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养', '长生', '沐浴', '冠带'],
    ['病', '死', '墓', '绝', '胎', '养', '长生', '沐浴', '冠带', '建禄', '帝旺', '衰'],
    ['帝旺', '衰', '病', '死', '墓', '绝', '胎', '养', '长生', '沐浴', '冠带', '建禄'],
    ['墓', '绝', '胎', '养', '长生', '沐浴', '冠带', '建禄', '帝旺', '衰', '病', '死'],
    ['衰', '病', '死', '墓', '绝', '胎', '养', '长生', '沐浴', '冠带', '建禄', '帝旺'],
    ['冠带', '建禄', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养', '长生', '沐浴']
])

tiangan_order = '甲乙丙丁戊己庚辛壬癸'
dizhi_order = '亥子丑寅卯辰巳午未申酉戌'

def get_yunxing(tiangan, dizhi):
    tiangan_index = tiangan_order.index(tiangan)
    dizhi_index = dizhi_order.index(dizhi)
    return matrix[tiangan_index, dizhi_index]

# 测试函数
test_cases = [
    ('甲', '亥'), ('乙', '子'), ('丙', '丑'), ('丁', '寅'), ('戊', '卯'),
    ('己', '辰'), ('庚', '巳'), ('辛', '午'), ('壬', '未'), ('癸', '申'),
    ('壬', '酉')  # 特别添加您指出的例子
]

print("测试结果:")
for tiangan, dizhi in test_cases:
    result = get_yunxing(tiangan, dizhi)
    print(f"天干: {tiangan}, 地支: {dizhi} -> 十二运星: {result}")

# 用户请求的特定例子
tiangan = '壬'
dizhi = '酉'
result = get_yunxing(tiangan, dizhi)
print(f"\n特定例子 - 天干: {tiangan}, 地支: {dizhi} -> 十二运星: {result}")