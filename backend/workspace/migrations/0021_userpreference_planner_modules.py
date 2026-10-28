from django.db import migrations, models

import workspace.models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0020_backfill_file_owners'),
    ]

    operations = [
        migrations.AddField(
            model_name='userpreference',
            name='planner_modules',
            field=models.JSONField(default=workspace.models.default_planner_modules),
        ),
    ]