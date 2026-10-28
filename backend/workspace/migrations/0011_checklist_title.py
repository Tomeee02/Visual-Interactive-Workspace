from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0010_note_checklist'),
    ]

    operations = [
        migrations.AddField(
            model_name='note',
            name='title',
            field=models.CharField(blank=True, default='Checklist', max_length=200),
        ),
        migrations.AddField(
            model_name='note',
            name='show_title',
            field=models.BooleanField(default=False),
        ),
    ]