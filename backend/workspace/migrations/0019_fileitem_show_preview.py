from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0018_userpreference_brain_dump'),
    ]

    operations = [
        migrations.AddField(
            model_name='fileitem',
            name='show_preview',
            field=models.BooleanField(default=True),
        ),
    ]