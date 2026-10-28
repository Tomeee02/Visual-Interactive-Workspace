from django.db import migrations, models
from django.contrib.auth.hashers import make_password


def create_admin_and_assign_owner(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Board = apps.get_model('workspace', 'Board')
    Note = apps.get_model('workspace', 'Note')
    FileItem = apps.get_model('workspace', 'FileItem')

    admin_email = 'tamas0225@gmail.com'
    user, created = User.objects.get_or_create(
        username=admin_email,
        defaults={
            'email': admin_email,
            'is_staff': True,
            'is_superuser': True,
        }
    )

    if created:
        user.password = make_password(None)
        user.save()
    else:
        if not user.is_staff or not user.is_superuser or user.email != admin_email:
            user.is_staff = True
            user.is_superuser = True
            user.email = admin_email
            user.save()

    Board.objects.filter(owner__isnull=True).update(owner=user)
    Note.objects.filter(owner__isnull=True).update(owner=user)
    FileItem.objects.filter(owner__isnull=True).update(owner=user)


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0007_alter_board_emoji_grayscale'),
    ]

    operations = [
        migrations.AddField(
            model_name='board',
            name='owner',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.CASCADE, related_name='boards', to='auth.user'),
        ),
        migrations.AddField(
            model_name='note',
            name='owner',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.CASCADE, related_name='notes', to='auth.user'),
        ),
        migrations.AddField(
            model_name='fileitem',
            name='owner',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.CASCADE, related_name='files', to='auth.user'),
        ),
        migrations.RunPython(create_admin_and_assign_owner, reverse_code=migrations.RunPython.noop),
    ]
