import os
import uuid
from django.conf import settings
from django.db import models


def default_planner_modules():
    return [
        {'id': 'tasks', 'visibility': {'personal': True, 'work': True}},
        {'id': 'fourteenDayTracker', 'visibility': {'personal': True, 'work': True}},
        {'id': 'dailyTracker', 'visibility': {'personal': True, 'work': True}},
    ]


class UserPreference(models.Model):
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('system', 'System'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='preferences')
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')
    tracker_state = models.JSONField(default=dict, blank=True)
    vault_auto_lock_minutes = models.PositiveSmallIntegerField(default=5)
    brain_dump = models.TextField(default='', blank=True)
    planner_modules = models.JSONField(default=default_planner_modules)
    planner_view = models.CharField(max_length=8, choices=[('personal', 'Personal'), ('work', 'Work')], default='personal')
    show_finished_tasks = models.BooleanField(default=False)

    def __str__(self):
        return f"Preferences for {self.user.username}"


class Vault(models.Model):
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vault')
    crypto_version = models.PositiveSmallIntegerField(default=1)
    kdf = models.JSONField()
    master_wrapped_key = models.JSONField()
    recovery_wrapped_key = models.JSONField()
    revision = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class VaultEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='vault_entries')
    vault = models.ForeignKey(Vault, on_delete=models.CASCADE, related_name='entries')
    ciphertext = models.TextField()
    nonce = models.CharField(max_length=64)
    crypto_version = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [models.Index(fields=['owner', 'updated_at'])]


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
    item_type = models.CharField(max_length=20, default='note')
    checklist_items = models.JSONField(default=list, blank=True)
    title = models.CharField(max_length=200, default='New checklist', blank=True)
    show_title = models.BooleanField(default=False)
    accent_color = models.CharField(max_length=20, default='#6366F1')
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


class Task(models.Model):
    PRIORITY_CHOICES = [
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    ]
    STATUS_CHOICES = [
        ('Not started', 'Not started'),
        ('In progress', 'In progress'),
        ('Done', 'Done'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tasks'
    )
    id = models.CharField(max_length=100, primary_key=True)
    description = models.CharField(max_length=500, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='Medium')
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Not started')
    done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', '-created_at']

    def __str__(self):
        return self.description or 'Untitled task'


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
    show_preview = models.BooleanField(default=True)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"File: {self.filename}"