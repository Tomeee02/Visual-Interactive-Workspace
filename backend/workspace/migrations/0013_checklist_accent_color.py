from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0012_new_checklist_default_title'),
    ]

    operations = [
        migrations.AddField(
            model_name='note',
            name='accent_color',
            field=models.CharField(default='#6366F1', max_length=20),
        ),
    ]