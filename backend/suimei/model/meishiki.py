from django.db import models
from django.conf import settings

# Create your models here.

class Meishiki(models.Model):
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
    )

    name = models.CharField(max_length=120)
    description = models.TextField(default="")
    birthDate = models.DateTimeField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES,default='M')
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meishiki_profiles",
        null=True,
        blank=True,
    )

    
    def __str__(self):
        return self.name

