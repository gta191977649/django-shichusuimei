# app/models.py
import json
from django.db import models

class Bunseki(models.Model):
    reason = models.TextField(default="")
    content = models.JSONField(default=dict)
    meishiki = models.ForeignKey("Meishiki", on_delete=models.CASCADE, related_name="bunsekis")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        txt = json.dumps(self.content, ensure_ascii=False)
        return (txt[:50] + "...") if len(txt) > 50 else txt
