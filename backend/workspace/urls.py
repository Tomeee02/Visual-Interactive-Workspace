from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BoardViewSet,
    NoteViewSet,
    FileItemViewSet,
    TaskViewSet,
    EmailLoginView,
    GoogleLoginView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    CurrentUserView,
    UserPreferenceView,
    LogoutView,
    LinkPreviewView,
    TextToSpeechView,
    VaultView,
    VaultEntryViewSet,
    VaultEntryBulkView,
)

router = DefaultRouter()
router.register(r'boards', BoardViewSet, basename='board')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'files', FileItemViewSet, basename='file')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'vault-entries', VaultEntryViewSet, basename='vault-entry')

urlpatterns = [
    path('vault-entries/bulk/', VaultEntryBulkView.as_view(), name='vault-entry-bulk'),
    path('', include(router.urls)),
    path('auth/login/', EmailLoginView.as_view(), name='email-login'),
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('auth/user/', CurrentUserView.as_view(), name='current-user'),
    path('preferences/', UserPreferenceView.as_view(), name='user-preferences'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('link-preview/', LinkPreviewView.as_view(), name='link-preview'),
    path('text-to-speech/', TextToSpeechView.as_view(), name='text-to-speech'),
    path('vault/', VaultView.as_view(), name='vault'),
]