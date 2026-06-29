from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("suimei", "0008_meishiki_owner"),
    ]

    operations = [
        migrations.AddField(
            model_name="meishiki",
            name="birthTimeUnknown",
            field=models.BooleanField(default=False),
        ),
    ]
