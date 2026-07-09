from django.contrib.auth.models import User
from rest_framework import serializers
from .model.chat import ChatMessage, ChatSession
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
        read_only_fields = ["owner"]

class BunsekiSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bunseki
        fields = '__all__'


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "reasoning", "created_at"]


class ChatSessionSummarySerializer(serializers.ModelSerializer):
    meishiki_id = serializers.IntegerField(read_only=True)
    message_count = serializers.IntegerField(read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    last_message_created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            "id",
            "title",
            "meishiki_id",
            "created_at",
            "updated_at",
            "message_count",
            "last_message_preview",
            "last_message_created_at",
        ]

    def get_last_message_preview(self, obj):
        preview = str(getattr(obj, "last_message_preview", "") or "").strip()
        return preview[:120]



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
