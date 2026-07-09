from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("suimei", "0009_meishiki_birth_time_unknown"),
    ]

    operations = [
        migrations.AddField(
            model_name="bunseki",
            name="element_insights",
            field=models.JSONField(default=dict),
        ),
    ]
