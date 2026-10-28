from django.db import migrations, models


def migrate_module_visibility(apps, schema_editor):
    UserPreference = apps.get_model('workspace', 'UserPreference')
    for preferences in UserPreference.objects.all().iterator():
        modules = preferences.planner_modules
        if not isinstance(modules, list):
            continue
        changed = False
        for module in modules:
            if isinstance(module, dict) and 'visibility' not in module:
                visible = module.pop('visible', True)
                module['visibility'] = {'personal': bool(visible), 'work': bool(visible)}
                changed = True
        if changed:
            preferences.planner_modules = modules
            preferences.save(update_fields=['planner_modules'])


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0021_userpreference_planner_modules'),
    ]

    operations = [
        migrations.AddField(
            model_name='userpreference',
            name='planner_view',
            field=models.CharField(choices=[('personal', 'Personal'), ('work', 'Work')], default='personal', max_length=8),
        ),
        migrations.RunPython(migrate_module_visibility, reverse_code=migrations.RunPython.noop),
    ]