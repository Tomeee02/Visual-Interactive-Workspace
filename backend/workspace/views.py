import json
import os
import re
import traceback
import datetime
import tempfile
import asyncio
from urllib import parse, request as url_request, error

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils.encoding import force_bytes, force_str
from django.utils import timezone
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from rest_framework.exceptions import AuthenticationFailed
import pyttsx3
import edge_tts

from .models import Board, Note, FileItem, Task, UserPreference, Vault, VaultEntry
from .serializers import BoardSerializer, NoteSerializer, FileItemSerializer, TaskSerializer, VaultEntrySerializer, VaultSerializer
from .thumbnails import generate_thumbnail


WINDOWS_LANGUAGE_LCIDS = {
    'en': {'0409', '0809', '0c09', '1009', '1409', '1809', '1c09', '2009', '2409', '2809', '2c09', '3009', '3409'},
    'hu': {'040e'},
}
NEURAL_SPEECH_VOICES = {
    'en': 'en-US-AriaNeural',
    'hu': 'hu-HU-NoemiNeural',
}


def voice_supports_language(voice, language_prefix):
    language_values = getattr(voice, 'languages', []) or []
    searchable_values = [getattr(voice, 'id', ''), getattr(voice, 'name', ''), *language_values]
    normalized_values = [
        value.decode('utf-8', errors='ignore').lower() if isinstance(value, bytes) else str(value).lower()
        for value in searchable_values
    ]
    locale_pattern = re.compile(rf'(^|[^a-z]){re.escape(language_prefix)}(?:[-_]|$)')
    valid_lcids = WINDOWS_LANGUAGE_LCIDS.get(language_prefix, set())
    return any(
        locale_pattern.search(value) or any(lcid in value.replace('0x', '') for lcid in valid_lcids)
        for value in normalized_values
    )


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
        with url_request.urlopen(url, timeout=10) as resp:
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


def get_password_reset_link(request, user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_path = f"/reset-password?uid={uid}&token={token}"
    return f"{request.scheme}://{request.get_host()}{reset_path}"


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_current_user_data(request.user))


class TextToSpeechView(APIView):
    permission_classes = [IsAuthenticated]
    language_prefixes = {'hu', 'en'}

    def post(self, request):
        text = (request.data.get('text') or '').strip()
        language = (request.data.get('language') or '').lower()
        language_prefix = language[:2]
        if not text or len(text) > 10000:
            return Response({'detail': 'Text must contain between 1 and 10000 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if language_prefix not in self.language_prefixes:
            return Response({'detail': 'Only English and Hungarian are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        output_path = None
        engine = None
        try:
            engine = pyttsx3.init()
            matching_voices = [
                voice for voice in engine.getProperty('voices')
                if voice_supports_language(voice, language_prefix)
            ]
            if matching_voices:
                engine.setProperty('voice', matching_voices[0].id)
                suffix = '.wav'
                content_type = 'audio/wav'
            else:
                engine.stop()
                engine = None
                suffix = '.mp3'
                content_type = 'audio/mpeg'
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as audio_file:
                output_path = audio_file.name
            if matching_voices:
                engine.save_to_file(text, output_path)
                engine.runAndWait()
                engine.stop()
                engine = None
            else:
                speech = edge_tts.Communicate(text, NEURAL_SPEECH_VOICES[language_prefix])
                asyncio.run(speech.save(output_path))
            with open(output_path, 'rb') as audio_file:
                audio = audio_file.read()
        except Exception:
            return Response({'detail': 'The speech service is temporarily unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        finally:
            if engine is not None:
                engine.stop()
            if output_path and os.path.exists(output_path):
                os.remove(output_path)
        response = HttpResponse(audio, content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="read-aloud{suffix}"'
        return response


class UserPreferenceView(APIView):
    permission_classes = [IsAuthenticated]
    planner_module_ids = {'tasks', 'fourteenDayTracker', 'dailyTracker', 'habitAnalytics'}

    def validate_planner_modules(self, modules):
        if not isinstance(modules, list) or len(modules) not in {len(self.planner_module_ids) - 1, len(self.planner_module_ids)}:
            return False
        ids = [module.get('id') for module in modules if isinstance(module, dict)]
        return (
            len(ids) == len(modules)
            and set(ids) in (self.planner_module_ids - {'habitAnalytics'}, self.planner_module_ids)
            and all(
                isinstance(module.get('visibility'), dict)
                and set(module['visibility']) == {'personal', 'work'}
                and all(isinstance(module['visibility'][view], bool) for view in ['personal', 'work'])
                for module in modules
            )
        )

    def get(self, request):
        preferences, _ = UserPreference.objects.get_or_create(user=request.user)
        return Response({
            'theme': preferences.theme,
            'trackerState': preferences.tracker_state,
            'vaultAutoLockMinutes': preferences.vault_auto_lock_minutes,
            'brainDump': preferences.brain_dump,
            'plannerModules': preferences.planner_modules,
            'plannerView': preferences.planner_view,
            'showFinishedTasks': preferences.show_finished_tasks,
        })

    def patch(self, request):
        preferences, _ = UserPreference.objects.get_or_create(user=request.user)
        update_fields = []

        if 'theme' in request.data:
            theme = request.data['theme']
            if theme not in dict(UserPreference.THEME_CHOICES):
                return Response({'theme': 'Choose light, dark, or system.'}, status=status.HTTP_400_BAD_REQUEST)
            preferences.theme = theme
            update_fields.append('theme')

        if 'trackerState' in request.data:
            tracker_state = request.data['trackerState']
            if not isinstance(tracker_state, dict):
                return Response({'trackerState': 'Must be an object.'}, status=status.HTTP_400_BAD_REQUEST)
            preferences.tracker_state = tracker_state
            update_fields.append('tracker_state')

        if 'vaultAutoLockMinutes' in request.data:
            auto_lock = request.data['vaultAutoLockMinutes']
            if auto_lock not in [1, 5, 15, 30]:
                return Response({'vaultAutoLockMinutes': 'Choose 1, 5, 15, or 30 minutes.'}, status=status.HTTP_400_BAD_REQUEST)
            preferences.vault_auto_lock_minutes = auto_lock
            update_fields.append('vault_auto_lock_minutes')

        if 'brainDump' in request.data:
            brain_dump = request.data['brainDump']
            if not isinstance(brain_dump, str):
                return Response({'brainDump': 'Must be a string.'}, status=status.HTTP_400_BAD_REQUEST)
            preferences.brain_dump = brain_dump
            update_fields.append('brain_dump')

        if 'plannerModules' in request.data:
            planner_modules = request.data['plannerModules']
            if not self.validate_planner_modules(planner_modules):
                return Response({'plannerModules': 'Must contain each supported planner module once.'}, status=status.HTTP_400_BAD_REQUEST)
            preferences.planner_modules = planner_modules
            update_fields.append('planner_modules')

        if 'plannerView' in request.data:
            planner_view = request.data['plannerView']
            if planner_view not in ['personal', 'work']:
                return Response({'plannerView': 'Choose personal or work.'}, status=status.HTTP_400_BAD_REQUEST)
            preferences.planner_view = planner_view
            update_fields.append('planner_view')

        if 'showFinishedTasks' in request.data:
            show_finished_tasks = request.data['showFinishedTasks']
            if not isinstance(show_finished_tasks, bool):
                return Response({'showFinishedTasks': 'Must be a boolean.'}, status=status.HTTP_400_BAD_REQUEST)
            preferences.show_finished_tasks = show_finished_tasks
            update_fields.append('show_finished_tasks')

        if not update_fields:
            return Response({'detail': 'No preferences provided.'}, status=status.HTTP_400_BAD_REQUEST)

        preferences.save(update_fields=update_fields)
        return Response({
            'theme': preferences.theme,
            'trackerState': preferences.tracker_state,
            'vaultAutoLockMinutes': preferences.vault_auto_lock_minutes,
            'brainDump': preferences.brain_dump,
            'plannerModules': preferences.planner_modules,
            'plannerView': preferences.planner_view,
            'showFinishedTasks': preferences.show_finished_tasks,
        })


class VaultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            vault = Vault.objects.get(owner=request.user)
        except Vault.DoesNotExist:
            return Response({'configured': False})
        return Response({'configured': True, **VaultSerializer(vault).data})

    def post(self, request):
        if Vault.objects.filter(owner=request.user).exists():
            return Response({'detail': 'Vault is already configured.'}, status=status.HTTP_409_CONFLICT)
        serializer = VaultSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vault = serializer.save(owner=request.user)
        return Response({'configured': True, **VaultSerializer(vault).data}, status=status.HTTP_201_CREATED)

    def patch(self, request):
        vault = get_object_or_404(Vault, owner=request.user)
        expected_revision = request.data.get('revision')
        if expected_revision != vault.revision:
            return Response({'detail': 'Vault configuration changed. Reload and retry.'}, status=status.HTTP_409_CONFLICT)
        serializer = VaultSerializer(vault, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(revision=vault.revision + 1)
        return Response({'configured': True, **serializer.data})


class VaultEntryViewSet(viewsets.ModelViewSet):
    serializer_class = VaultEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return VaultEntry.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        vault = get_object_or_404(Vault, owner=self.request.user)
        serializer.save(owner=self.request.user, vault=vault)


class VaultEntryBulkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entries = request.data.get('entries')
        if not isinstance(entries, list) or not entries or len(entries) > 500:
            return Response({'entries': 'Provide between 1 and 500 encrypted entries.'}, status=status.HTTP_400_BAD_REQUEST)
        vault = get_object_or_404(Vault, owner=request.user)
        serializer = VaultEntrySerializer(data=entries, many=True)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save(owner=request.user, vault=vault)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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


@method_decorator(csrf_exempt, name='dispatch')
class EmailLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        password = request.data.get('password') or ''

        if not email or not password:
            raise AuthenticationFailed('Email and password are required.')

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise AuthenticationFailed('Invalid email or password.')

        if not user.has_usable_password():
            raise AuthenticationFailed('This account has no password. Use the Forgot password link to set one.')

        user = authenticate(request, username=user.username, password=password)
        if user is None:
            raise AuthenticationFailed('Invalid email or password.')

        login(request, user)
        return Response(get_current_user_data(user))


@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        if not email:
            return Response({'detail': 'Adj meg egy email címet.'}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(email__iexact=email)
        for user in users:
            reset_link = get_password_reset_link(request, user)
            message = (
                f"Szia,\n\n"
                f"Kérted a jelszó visszaállítását. Kattints a következő linkre a jelszó megváltoztatásához:\n\n"
                f"{reset_link}\n\n"
                "Ha nem te kérted, akkor nyugodtan hagyd figyelmen kívül ezt az üzenetet."
            )
            send_mail(
                subject='Jelszó visszaállítás',
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        return Response({'detail': 'Ha létezik ilyen email című felhasználó, küldtünk neki visszaállító linket.'})


@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('password') or ''

        if not uid or not token or not new_password:
            raise AuthenticationFailed('Érvénytelen kérés.')

        try:
            uid = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise AuthenticationFailed('Érvénytelen visszaállító hivatkozás.')

        if not default_token_generator.check_token(user, token):
            raise AuthenticationFailed('Érvénytelen vagy lejárt hivatkozás.')

        try:
            validate_password(new_password, user)
        except ValidationError as exc:
            return Response({'detail': exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        return Response({'detail': 'A jelszó sikeresen visszaállítva.'})


@method_decorator(csrf_exempt, name='dispatch')
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


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Task.objects.filter(owner=self.request.user)
        if self.action != 'list':
            return queryset
        week = self.request.query_params.get('week')
        if week:
            try:
                week_start = datetime.date.fromisoformat(week)
            except ValueError:
                return queryset.none()
        else:
            week_start = timezone.localdate()
        week_end = week_start + datetime.timedelta(days=6)
        return queryset.filter(Q(due_date__isnull=True) | Q(due_date__lte=week_end))

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class LinkPreviewView(APIView):
    """Fetch basic Open Graph metadata for a note containing one URL."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        target = request.query_params.get('url', '').strip()
        parsed = parse.urlparse(target)
        if parsed.scheme not in ('http', 'https') or not parsed.netloc:
            return Response({'detail': 'Invalid URL.'}, status=status.HTTP_400_BAD_REQUEST)

        if parsed.hostname in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'):
            oembed_url = 'https://www.youtube.com/oembed?' + parse.urlencode({
                'url': target,
                'format': 'json',
            })
            try:
                response = url_request.urlopen(
                    url_request.Request(oembed_url, headers={'User-Agent': 'VisualWorkspace/1.0'}),
                    timeout=5,
                )
                metadata = json.loads(response.read(65536).decode('utf-8'))
            except (error.URLError, TimeoutError, UnicodeError, ValueError):
                return Response({'detail': 'Preview unavailable.'}, status=status.HTTP_502_BAD_GATEWAY)

            return Response({
                'url': target,
                'title': metadata.get('title', ''),
                'description': '',
                'image': metadata.get('thumbnail_url', ''),
                'domain': parsed.netloc,
                'favicon': 'https://www.youtube.com/favicon.ico',
            })

        try:
            response = url_request.urlopen(
                url_request.Request(target, headers={'User-Agent': 'VisualWorkspace/1.0'}),
                timeout=5,
            )
            html = response.read(1024 * 1024).decode('utf-8', errors='replace')
        except (error.URLError, TimeoutError, UnicodeError):
            return Response({'detail': 'Preview unavailable.'}, status=status.HTTP_502_BAD_GATEWAY)

        def meta(*keys):
            for key in keys:
                match = re.search(
                    rf'<meta[^>]+(?:property|name)=["\']{re.escape(key)}["\'][^>]+content=["\']([^"\']*)',
                    html,
                    re.IGNORECASE,
                )
                if match:
                    return match.group(1).strip()
            return ''

        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        title = meta('og:title', 'twitter:title') or (re.sub(r'\s+', ' ', title_match.group(1)).strip() if title_match else parsed.netloc)
        description = meta('og:description', 'twitter:description', 'description')
        image = meta('og:image', 'twitter:image')
        if image:
            image = parse.urljoin(target, image)

        return Response({
            'url': target,
            'title': title,
            'description': description,
            'image': image,
            'domain': parsed.netloc,
            'favicon': parse.urljoin(target, '/favicon.ico'),
        })


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
        self.perform_create(serializer)
        instance = serializer.instance

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