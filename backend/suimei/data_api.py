from rest_framework import viewsets
from .model.meishiki import Meishiki
from .model.bunseki import Bunseki
from .serializers import MeishikiSerializer,BunsekiSerializer
from .serializers import WikiSearchSerializer
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response


class BunsekiViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Bunseki.objects.all()
    serializer_class = BunsekiSerializer

class MeishikiViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Meishiki.objects.all()
    serializer_class = MeishikiSerializer


class WikiViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def search(self, request):
        serializer = WikiSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)


class MeishikiViewSet(viewsets.ModelViewSet):
    queryset = Meishiki.objects.all()
    serializer_class = MeishikiSerializer
    permission_classes = [AllowAny]


class AIViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    @action(detail=False, methods=['get'])
    def query(self, request):
        test_resp = [
  {"entity": "格局定位",
  "content": "八字格局为财旺身弱局，日主庚金生于寅月，财星当令而身弱，形成财多身弱之象。\n天赋方面：命主对财富敏感，善于发现商机，例如在投资理财中能快速识别潜在机会，但因身弱需外力扶持，如合伙经营可发挥优势；同时偏印坐夫妻宫，代表有学习与思考天赋，适合从事需要深度分析的领域，如研究或策划工作。\nBUG方面：身弱不胜财，易因财致祸，例如冲动投资导致资金链断裂，或过度追求利益而忽视风险；财星为忌，也可能因钱财与人发生纠纷，如借贷不还引发矛盾。"},
  {"entity": "八字病药",
  "content": "八字主要病处为身弱财旺，日主庚金失令，财星木旺克身，形成财多身弱的不自洽矛盾，核心问题在于命主难以承担旺财带来的压力。\n药方为喜行金土五行来扶身，金为比劫助身，土为印绶生身，例如大运或流年逢庚辛申酉或戊己辰戌丑未时可缓解。\n化解方式：\n1. 思维方式：建议培养理性决策习惯，避免贪婪冲动，例如在投资前先评估自身承受力，参考他人意见以减少盲动；\n2. 生活习惯：适合稳定、少变动的环境，例如选择固定居所和规律作息，避免频繁更换工作或居住地，以土性环境如山区或田园地带为宜，增强自身根基。"},
  {"entity": "基本性格",
  "content": "基本性格以庚金日主为核心，身弱财旺，导致外显刚毅内里脆弱。\n庚金特性重义气但固执，例如对朋友慷慨相助，却容易因钱财问题坚持己见而引发冲突；财星旺则对物质敏感，可能过度追求利益，如工作中为奖金斤斤计较；偏印坐夫妻宫，增添内向深思倾向，例如遇事习惯独自分析，但易因多虑而延误行动。"},
  {"entity": "姻缘情况",
  "content": "1. 妻星喜忌：妻星为木（正财乙木藏辰土，偏财甲木藏寅木），身弱财为忌，代表配偶可能带来财务压力，但夫妻宫辰土为偏印喜神，能化解部分不利，例如配偶虽注重物质，但能提供精神支持。\n2. 夫/妻入局：妻星无严重刑冲破害，能入局，但需大运流年引动，如当前己亥大运土水相生，有利感情稳定；若无冲克，婚姻基础较牢固。\n3. 夫妻宫情况：日支辰土为偏印坐实，代表配偶聪明务实，能实际帮助命主，例如在困难时提供建议或资源，但偏印也暗示沟通可能含蓄，需耐心磨合。"},
  {"entity": "另一半情况",
  "content": "1. 夫/妻子性格：基于妻星木和夫妻宫偏印，配偶性格温和但内敛，可能有些固执，例如处事坚持原则，但善于思考；\n2. 外貌特点：木主修长清秀，可能身材高挑，面容端庄；\n3. 从事行业：木属性行业，如教育、文化或环保领域，例如教师或文案工作；\n4. 兴趣爱好：偏向文艺活动，如阅读、园艺或书法；\n5. 家庭情况：可能来自中等家庭，注重传统价值观，父母可能有稳定职业。"},
  {"entity": "另一半互动方式",
  "content": "1. 沟通方式：偏印影响，配偶沟通含蓄需引导，例如习惯用暗示而非直白表达，命主需主动询问以避免误解；\n2. 生活方式：偏好稳定家庭生活，例如注重日常规律，共同经营家居环境；\n3. 互动方式：夫妻宫为喜神，互动以支持为主，例如配偶在财务或情感上提供帮助，但需注意财星为忌可能引发金钱分歧，建议定期沟通预算。"}
]

        return Response(test_resp)


