# Generated manually for profile ownership.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("suimei", "0007_bunseki_created_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="meishiki",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="meishiki_profiles",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
