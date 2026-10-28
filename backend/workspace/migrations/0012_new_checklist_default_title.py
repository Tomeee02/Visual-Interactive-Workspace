from django.db import migrations, models


def rename_default_checklist_titles(apps, schema_editor):
    Note = apps.get_model('workspace', 'Note')
    Note.objects.filter(item_type='checklist', title='Checklist').update(title='New checklist')


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0011_checklist_title'),
    ]

    operations = [
        migrations.RunPython(rename_default_checklist_titles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='note',
            name='title',
            field=models.CharField(blank=True, default='New checklist', max_length=200),
        ),
    ]