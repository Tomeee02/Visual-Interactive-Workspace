from django.db import migrations, models


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
    ]
