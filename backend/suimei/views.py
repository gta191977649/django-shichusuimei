from django.shortcuts import render
from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from .meishiki import Meishi
from .model.bunseki import Bunseki
from .model.meishiki import Meishiki
import datetime
from .service.deepseek import analyze_bazi, DeepseekError
from django.shortcuts import get_object_or_404
from .service.prompt_builder import build_prompt_from_meishiki
from django.core.cache import cache
LOCK_TTL_SEC = 15 * 60  # lock for 15min (long-running)


class BunsekiView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        meishiki_id = request.query_params.get("meishiki_id")
        if not meishiki_id:
            return Response({"detail": "meishiki_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        meishiki = get_object_or_404(Meishiki, pk=meishiki_id)

        # 0) return cached if exists
        existing = Bunseki.objects.filter(meishiki_id=meishiki_id).order_by("-id").first()
        if existing:
            return Response({"content": existing.content, "reason": getattr(existing, "reason", "")}, status=status.HTTP_200_OK)

        # ---- concurrency guard (no parallel DeepSeek calls per meishiki_id) ----
        lock_key = f"bunseki:lock:{meishiki_id}"
        # cache.add returns True if the key was added (i.e., we acquired the lock)
        if not cache.add(lock_key, "1", timeout=LOCK_TTL_SEC):
            # someone else is computing now
            return Response(
                {"status": "processing", "detail": "Bunseki generation in progress."},
                status=status.HTTP_202_ACCEPTED,
                headers={"Retry-After": "5"},
            )

        # continue under the lock
        try:
            # Parse datetime
            dt_value = getattr(meishiki, "birthDate", None) or getattr(meishiki, "datetime", None)
            if isinstance(dt_value, datetime.datetime):
                date_parts = (dt_value.year, dt_value.month, dt_value.day)
                time_parts = (dt_value.hour, dt_value.minute)
            elif isinstance(dt_value, str):
                dt_value = datetime.datetime.fromisoformat(dt_value.replace("Z", "+00:00"))
                date_parts = (dt_value.year, dt_value.month, dt_value.day)
                time_parts = (dt_value.hour, dt_value.minute)
            else:
                return Response({"detail": "Cannot parse datetime from Meishiki record."}, status=status.HTTP_400_BAD_REQUEST)

            # Gender
            raw_gender = getattr(meishiki, "gender", "M")
            gender = 1 if str(raw_gender).lower() in ["m", "male", "男", "1"] else 0

            # Build datetime for Meishi
            date_time_obj = datetime.datetime(
                year=date_parts[0], month=date_parts[1], day=date_parts[2],
                hour=time_parts[0], minute=time_parts[1],
            )

            # Meishi instance (if your prompt builder needs it)
            bazi = Meishi(date_time_obj, int(gender))

            # Build prompt
            try:
                messages = build_prompt_from_meishiki(bazi)  # should return List[dict]
            except Exception as e:
                return Response({"detail": f"Failed to build bazi text: {e}"}, status=status.HTTP_400_BAD_REQUEST)

            # Call DeepSeek (allow long await; streaming stays server-side)
            try:
                result = analyze_bazi(messages=messages, stream_debug=True)
                #result = []
                content = result.get("payload", [])
                reason = result.get("reason", "")
            except DeepseekError as e:
                return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
            except Exception as e:
                return Response({"detail": f"AI error: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

            # Save + return
            obj = Bunseki.objects.create(meishiki_id=meishiki_id, content=content, reason=reason)
            return Response({"content": obj.content, "reason": obj.reason}, status=status.HTTP_201_CREATED)

        finally:
            # release lock
            cache.delete(lock_key)
class SuimeiView(APIView):
    permission_classes = [AllowAny]

    # This api is to compute the meisiki based on given date
    def post(self, request, format=None):
        print(request.data)
        # Extracting date and time from the request
        date_str = request.data.get('date')  # e.g., '2024-09-05'
        time_str = request.data.get('time')  # e.g., '14:18'
        gender = request.data.get('gender')
        # Parsing the date and time
        date_parts = [int(part) for part in date_str.split('-')]  # Split the date string and convert to integers
        time_parts = [int(part) for part in time_str.split(':')]  # Split the time string and convert to integers

        # Creating a datetime object
        date_time_obj = datetime.datetime(
            year=date_parts[0],
            month=date_parts[1],
            day=date_parts[2],
            hour=time_parts[0],
            minute=time_parts[1]
        )

        # Assuming Meishi is a class you have defined elsewhere that takes a datetime and does something with it
        meishi = Meishi(date_time_obj,int(gender))
        data = {
            "gender": int(gender),
            "birth":meishi.birthdate,
            "tenkan":meishi.tenkan,
            "chishi":meishi.chishi,
            "kubou":meishi.kubou,
            "junshi":{
                "tenkan":meishi.junshi[0],
                "zoukan_honki":meishi.junshi[3],
                "zoukan_chuki":meishi.junshi[2],
                "zoukan_yoki":meishi.junshi[1],
            },
            "juniunshi":meishi.juniunshi,
            "zoukan":meishi.zoukan,
            "shi_type": meishi.shin_type,
            "tsukirei_point":meishi.tsukirei_point,
            "gogyu_point":meishi.gogyu_point,
            "juniun_point":meishi.juniun_point,
            "shi_type_note":meishi.shin_type_note,
            "ritsun_time": meishi.ritsun,
            "younjin": meishi.younjin,
            "kakyoku": meishi.kakyoku,
            "daiun_table": {
                "daiun": meishi.daiunList,
                "year_table":meishi.yearList,
            },
            "element_energy":meishi.element_energy,
            "gouka":meishi.gouka,
            "trend": {
                "daiun":meishi.trend.daiun,
                "suiun":meishi.trend.suiun,
            },
        }  # Your custom JSON data
        print(meishi.daiunList)

        return Response(data, status=status.HTTP_200_OK)
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

