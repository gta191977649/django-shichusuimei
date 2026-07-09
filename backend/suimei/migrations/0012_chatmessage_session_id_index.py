from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("suimei", "0011_chatsession_chatmessage"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["session", "id"], name="suimei_chatmsg_session_id_idx"),
        ),
    ]
