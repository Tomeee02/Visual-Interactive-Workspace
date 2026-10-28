from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0015_task'),
    ]

    operations = [
        migrations.AddField(
            model_name='userpreference',
            name='tracker_state',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]