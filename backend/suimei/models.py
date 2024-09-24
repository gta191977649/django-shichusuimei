from django.db import models

# Create your models here.

class Meishiki(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField()
    birthDate = models.DateTimeField()
    
    def __str__(self):
        return self.name

