from django.db import migrations


def assign_file_owners(apps, schema_editor):
    Board = apps.get_model('workspace', 'Board')
    FileItem = apps.get_model('workspace', 'FileItem')

    board_owners = dict(Board.objects.values_list('id', 'owner_id'))
    for file_item in FileItem.objects.filter(owner__isnull=True).iterator():
        owner_id = board_owners.get(file_item.board_id)
        if owner_id:
            FileItem.objects.filter(pk=file_item.pk).update(owner_id=owner_id)


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0019_fileitem_show_preview'),
    ]

    operations = [
        migrations.RunPython(assign_file_owners, reverse_code=migrations.RunPython.noop),
    ]