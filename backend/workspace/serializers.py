from rest_framework import serializers
from .models import Board, Note, FileItem


class BoardSerializer(serializers.ModelSerializer):
    """Serializer for Board model."""
    items = serializers.SerializerMethodField()
    board_count = serializers.SerializerMethodField()
    note_count = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = ['id', 'title', 'emoji', 'bg_color', 'emoji_grayscale', 'parent_id', 'x', 'y', 'items', 
                  'board_count', 'note_count', 'file_count', 'created_at', 'updated_at']

    def get_items(self, obj):
        """Get all items (notes, boards, and files) for this board."""
        notes = Note.objects.filter(board_id=obj.id).values_list('id', flat=True)
        boards = Board.objects.filter(parent_id=obj.id).values_list('id', flat=True)
        files = FileItem.objects.filter(board_id=obj.id).values_list('id', flat=True)
        return list(notes) + list(boards) + list(files)

    def get_board_count(self, obj):
        """Get count of child boards."""
        return Board.objects.filter(parent_id=obj.id).count()

    def get_note_count(self, obj):
        """Get count of notes in this board."""
        return Note.objects.filter(board_id=obj.id).count()

    def get_file_count(self, obj):
        """Get count of files in this board."""
        return FileItem.objects.filter(board_id=obj.id).count()


class NoteSerializer(serializers.ModelSerializer):
    """Serializer for Note model."""

    class Meta:
        model = Note
        fields = ['id', 'board_id', 'content', 'x', 'y', 'width', 'height',
                  'bg_color', 'text_color', 'created_at', 'updated_at']


class FileItemSerializer(serializers.ModelSerializer):
    """Serializer for FileItem model."""
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = FileItem
        fields = ['id', 'board_id', 'filename', 'file', 'file_url', 'file_size',
                  'thumbnail', 'thumbnail_url', 'x', 'y', 'created_at', 'updated_at']
        extra_kwargs = {
            'file': {'write_only': True, 'required': False},
            'thumbnail': {'read_only': True},
            'board_id': {'required': False, 'allow_null': True},
        }

    def get_file_url(self, obj):
        """Return the URL for the uploaded file."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def get_thumbnail_url(self, obj):
        """Return the URL for the thumbnail image."""
        if obj.thumbnail:
            request = self.context.get('request')
            from django.conf import settings
            url = f"{settings.MEDIA_URL}{obj.thumbnail}"
            if request:
                return request.build_absolute_uri(url)
            return url
        return None