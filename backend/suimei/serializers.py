from django.contrib.auth.models import User
from rest_framework import serializers
from .model.meishiki import Meishiki
from .model.wiki import Wiki
from .model.bunseki import Bunseki

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        print(validated_data)
        user = User.objects.create_user(**validated_data)
        return user


class MeishikiSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meishiki
        fields = '__all__'

class BunsekiSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bunseki
        fields = '__all__'



class WikiSearchSerializer(serializers.Serializer):
    key = serializers.CharField(write_only=True)
    description = serializers.CharField(read_only=True)
    tag = serializers.CharField(read_only=True)

    def validate_key(self, value):
        try:
            wiki = Wiki.objects.get(key=value)
        except Wiki.DoesNotExist:
            raise serializers.ValidationError("Wiki not found for the given key.")
        self.instance = wiki
        return value

    def to_representation(self, instance):
        return {
            "description": instance.description,
            "tag": instance.tag,
        }