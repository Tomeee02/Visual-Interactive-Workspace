from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0009_create_default_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='note',
            name='item_type',
            field=models.CharField(default='note', max_length=20),
        ),
        migrations.AddField(
            model_name='note',
            name='checklist_items',
            field=models.JSONField(blank=True, default=list),
        ),
    ]