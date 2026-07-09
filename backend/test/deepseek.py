# Please install OpenAI SDK first: `pip3 install openai`
import os

from openai import OpenAI

KEY = os.getenv("DEEPSEEK_API_KEY", "")
if not KEY:
    raise RuntimeError("Set DEEPSEEK_API_KEY before running this script.")

client = OpenAI(api_key=KEY, base_url="https://api.deepseek.com")

# Send the request with streaming enabled
response = client.chat.completions.create(
    model="deepseek-reasoner",
    messages=[
        {
            "role": "system",
            "content": "你是一个专业的命理学家，用户会给你他的八字，请根据输入八字命盘进行解盘，并用八字断语语和举例解释详细说明（不要笼统）。（可以使用<辅助信息参考>结果,  并用JSON 的形式输出,且使用换行符转义序列 \\n 分开每一段完整的段落，输出的 JSON 需遵守以下的格式：\n\n[\n  "
               "{\"entity\": <格局定位>,\n  \"content\": <八字格局定位，并找出这个人的天赋有哪些（举例说明），BUG在哪里（举例说明）>}"
               "{\"entity\": <八字病药>,\n  \"content\": <请分析八字中主要的病和药（核心不自洽的地方)在哪里? 请使用八字术语说明清楚并从1.进思维方式,2.生活习惯（只说明适合环境特性，不用说行业名称）的角度来举例解释如何建议的化解方式>}"
               "{\"entity\": <基本性格>,\n  \"content\": <基本性格详细特点(请使用八字术语并附上举例解释)>}"
               "{\"entity\": <姻缘情况>,\n  \"content\": <1.夫/妻星喜忌, 2.夫/妻是否能入局(有刑冲破害), 3.夫妻宫情况是否坐实(请使用八字术语并举例解释代表什么意思)>}"
               "{\"entity\": <另一半情况>,\n  \"content\": <1.夫/妻子性格，2.外貌特点 3.从事行业 4.兴趣爱好， 5.家庭情况>}"
               "{\"entity\": <另一半互动方式>,\n  \"content\": <1.沟通方式 2.生活方式 3.互动方式>}"
                       "]"
        },
        #  格局：财旺局（参考）。
        {"role": "system", "content": "<辅助信息参考>"
          "[日主旺衰]：庚金生于寅月（春季），寅为月令，木旺火相，金处休囚之。日主不得令， 身偏弱。"
          "[喜行五行]：金土（旺衰法）。当前大运：己亥。 <感情分析参考>妻星：木：正财：乙木（藏辰土），偏财：甲木（藏寅木），夫妻宫：辰土（偏印）（喜）"},
        {"role": "user", "content": "八字：丁丑，壬寅，庚辰，辛巳，（男命），阳历（真太阳时）：1997年2月7日9:48分"},

    ],
    stream=True,
)


# Stream and print the response
print("📡 Streaming response...\n")

full_reply = ""
full_reasoning = ""

for chunk in response:
    if hasattr(chunk, "choices") and chunk.choices:
        delta = chunk.choices[0].delta

        # 检查并处理 reasoning_content
        if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
            reasoning_content = delta.reasoning_content
            print(f"{reasoning_content}", end="", flush=True)
            full_reasoning += reasoning_content

        # 检查并处理普通内容
        if delta and delta.content:
            print(f"{delta.content}", end="", flush=True)
            full_reply += delta.content

print("\n\n✅ Streaming complete.")

# 打印完整结果
print("\n" + "=" * 50)
print("完整推理过程:")
print(full_reasoning)
print("\n" + "=" * 50)
print("完整回答内容:")
print(full_reply)
