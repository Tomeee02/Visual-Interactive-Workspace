import json
import os
import traceback
from urllib import parse, request, error

from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from rest_framework.exceptions import AuthenticationFailed

from .models import Board, Note, FileItem
from .serializers import BoardSerializer, NoteSerializer, FileItemSerializer
from .thumbnails import generate_thumbnail


class BoardViewSet(viewsets.ModelViewSet):
    """ViewSet for Board model."""
    queryset = Board.objects.all()
    serializer_class = BoardSerializer

    def get_queryset(self):
        """Filter boards by current user and parent_id if provided."""
        queryset = Board.objects.filter(owner=self.request.user)
        parent_id = self.request.query_params.get('parent', None)
        if parent_id is not None:
            queryset = queryset.filter(parent_id=parent_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a new board."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Update a board."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Delete a board and all its contents."""
        instance = self.get_object()
        Note.objects.filter(board_id=instance.id).delete()
        FileItem.objects.filter(board_id=instance.id).delete()
        child_boards = Board.objects.filter(parent_id=instance.id)
        for child in child_boards:
            self.delete_board_recursive(child.id)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete_board_recursive(self, board_id):
        """Recursively delete a board and all its contents."""
        try:
            board = Board.objects.get(id=board_id, owner=self.request.user)
            Note.objects.filter(board_id=board_id, owner=self.request.user).delete()
            FileItem.objects.filter(board_id=board_id, owner=self.request.user).delete()
            child_boards = Board.objects.filter(parent_id=board_id, owner=self.request.user)
            for child in child_boards:
                self.delete_board_recursive(child.id)
            board.delete()
        except Board.DoesNotExist:
            pass


def verify_google_id_token(id_token):
    """Verify a Google ID token via Google's tokeninfo endpoint."""
    if not id_token:
        raise AuthenticationFailed('Missing Google id_token.')

    url = f'https://oauth2.googleapis.com/tokeninfo?id_token={parse.quote(id_token)}'
    try:
        with request.urlopen(url, timeout=10) as resp:
            token_info = json.load(resp)
    except error.HTTPError as exc:
        raise AuthenticationFailed('Invalid Google id_token.') from exc
    except Exception as exc:
        raise AuthenticationFailed('Unable to verify Google id_token.') from exc

    if token_info.get('aud') != settings.GOOGLE_CLIENT_ID:
        raise AuthenticationFailed(
            f"Google id_token audience does not match. expected={settings.GOOGLE_CLIENT_ID}, got={token_info.get('aud')}"
        )

    if token_info.get('email_verified') not in ['true', True, 'True']:
        raise AuthenticationFailed('Google account email not verified.')

    return token_info


def get_current_user_data(user):
    return {
        'username': user.username,
        'email': user.email,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    }


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_current_user_data(request.user))


@method_decorator(csrf_exempt, name='dispatch')
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token = request.data.get('id_token')
        token_info = verify_google_id_token(id_token)
        email = token_info.get('email')
        if not email:
            raise AuthenticationFailed('Google token did not include an email.')

        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                'email': email,
                'is_staff': email == 'tamas0225@gmail.com',
                'is_superuser': email == 'tamas0225@gmail.com',
            }
        )
        if created:
            user.set_unusable_password()

        if email == 'tamas0225@gmail.com':
            user.is_staff = True
            user.is_superuser = True

        if user.email != email:
            user.email = email

        user.save()
        login(request, user)
        return Response(get_current_user_data(user))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'detail': 'Logged out.'}, status=status.HTTP_200_OK)


class NoteViewSet(viewsets.ModelViewSet):
    """ViewSet for Note model."""
    queryset = Note.objects.all()
    serializer_class = NoteSerializer

    def get_queryset(self):
        """Filter notes by current user and board_id if provided."""
        queryset = Note.objects.filter(owner=self.request.user)
        board_id = self.request.query_params.get('board', None)
        if board_id is not None:
            queryset = queryset.filter(board_id=board_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a new note."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Update a note."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class FileItemViewSet(viewsets.ModelViewSet):
    """ViewSet for FileItem model with file upload and thumbnail generation."""
    queryset = FileItem.objects.all()
    serializer_class = FileItemSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        """Filter files by current user and board_id if provided."""
        queryset = FileItem.objects.filter(owner=self.request.user)
        board_id = self.request.query_params.get('board', None)
        if board_id is not None:
            queryset = queryset.filter(board_id=board_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a new file item with file upload and thumbnail generation."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        # Generate thumbnail for PDF and DOCX files - wrapped in try/except
        # so thumbnail failure never prevents file upload from succeeding
        try:
            if instance.file:
                file_path = instance.file.path
                thumbnail_rel = generate_thumbnail(file_path, instance.filename)
                if thumbnail_rel:
                    instance.thumbnail = thumbnail_rel
                    instance.save(update_fields=['thumbnail'])
        except Exception as e:
            print(f"Thumbnail generation error (non-fatal): {e}")
            traceback.print_exc()

        # Re-serialize to include thumbnail_url
        result_serializer = self.get_serializer(instance)
        headers = self.get_success_headers(result_serializer.data)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Update a file item (position, etc.)."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Delete a file item and its associated file and thumbnail."""
        instance = self.get_object()
        # Delete the actual file from storage
        if instance.file:
            try:
                instance.file.delete(save=False)
            except Exception:
                pass
        # Delete the thumbnail
        if instance.thumbnail:
            try:
                thumb_path = os.path.join(settings.MEDIA_ROOT, instance.thumbnail)
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)
            except Exception:
                pass
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)