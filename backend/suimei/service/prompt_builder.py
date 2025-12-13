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
        return "未知元素"


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


def build_prompt_from_meishiki(bazi) -> str:
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
                "  {\"entity\": \"天赋优势\", \"content\": \"请详细描述命主的天赋与潜能。包括1. 擅长的事（举例说明为什么擅长），2. 不擅长的事（说明八字中何处导致），3. 潜在挑战与矛盾点（分析原因），4. 如何运用与发挥自身天赋（附推理过程）。\"},"
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

        {"role": "user", "content": user_prompt},

    ]
    # Send ISO + hints if you don’t have Meishi wired up yet.
    print(prompt_test)

    return prompt_test

# 冬季亥子丑月，需火来解冻暖局，见火为吉。
# 夏季巳午未月，需水来降温润局，水运不错。
# 春秋气候适中，若无显著汗湿或燥热，则无需调后。