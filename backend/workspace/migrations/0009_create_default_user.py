from django.db import migrations


def create_default_user(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    email = 'tamas0225@gmail.com'
    password = 'Hello123'

    if not User.objects.filter(username=email).exists():
        user = User.objects.create_user(username=email, email=email, password=password)
        user.is_staff = True
        user.is_superuser = True
        user.save()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0008_add_owner_fields'),
    ]

    operations = [
        migrations.RunPython(create_default_user, noop),
    ]
