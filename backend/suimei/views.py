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
import datetime
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
        }  # Your custom JSON data
        print(meishi.daiunList)

        return Response(data, status=status.HTTP_200_OK)
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]