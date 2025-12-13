from django.db import models

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

    
    def __str__(self):
        return self.name

