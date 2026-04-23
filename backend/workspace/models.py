import os
import uuid
from django.conf import settings
from django.db import models


class Board(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='boards'
    )
    """Board model representing a workspace board."""
    id = models.CharField(max_length=100, primary_key=True)
    title = models.CharField(max_length=200)
    emoji = models.CharField(max_length=10, default='📋')
    bg_color = models.CharField(max_length=20, default='#F3F4F6')
    emoji_grayscale = models.BooleanField(default=False)
    parent_id = models.CharField(max_length=100, null=True, blank=True)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.emoji} {self.title}"


class Note(models.Model):
    """Note model representing a sticky note."""
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notes'
    )
    id = models.CharField(max_length=100, primary_key=True)
    board_id = models.CharField(max_length=100)
    content = models.TextField(blank=True)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    width = models.IntegerField(default=200)
    height = models.IntegerField(default=150)
    bg_color = models.CharField(max_length=20, default='#FEF3C7')
    text_color = models.CharField(max_length=20, default='#1F2937')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note: {self.content[:50]}"


def file_upload_path(instance, filename):
    """Generate upload path for files."""
    ext = os.path.splitext(filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return f"uploads/{unique_name}"


class FileItem(models.Model):
    """FileItem model representing an uploaded file on the canvas."""
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='files'
    )
    id = models.CharField(max_length=100, primary_key=True)
    board_id = models.CharField(max_length=100, null=True, blank=True)  # null when cut/in clipboard
    filename = models.CharField(max_length=255)
    file = models.FileField(upload_to=file_upload_path)
    file_size = models.IntegerField(default=0)
    thumbnail = models.CharField(max_length=500, null=True, blank=True)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"File: {self.filename}"