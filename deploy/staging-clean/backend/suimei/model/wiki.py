from django.db import models

class Wiki(models.Model):
    key = models.CharField(max_length=255)
    description = models.TextField()
    tag = models.CharField(max_length=100, null=True, blank=True)