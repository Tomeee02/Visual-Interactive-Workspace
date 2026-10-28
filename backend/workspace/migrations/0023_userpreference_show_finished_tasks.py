from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0022_planner_views'),
    ]

    operations = [
        migrations.AddField(
            model_name='userpreference',
            name='show_finished_tasks',
            field=models.BooleanField(default=False),
        ),
    ]