from django.contrib import admin
from .models import Board, Note, FileItem


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'emoji', 'parent_id', 'owner', 'created_at']
    search_fields = ['title', 'id', 'owner__email']
    list_filter = ['created_at', 'owner']


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'board_id', 'owner', 'content', 'created_at']
    search_fields = ['content', 'id', 'owner__email']
    list_filter = ['created_at', 'board_id', 'owner']


@admin.register(FileItem)
class FileItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'board_id', 'filename', 'owner', 'created_at']
    search_fields = ['filename', 'id', 'owner__email']
    list_filter = ['created_at', 'owner']