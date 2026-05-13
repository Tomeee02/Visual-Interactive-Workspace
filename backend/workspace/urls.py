from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BoardViewSet,
    NoteViewSet,
    FileItemViewSet,
    EmailLoginView,
    GoogleLoginView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    CurrentUserView,
    LogoutView,
)

router = DefaultRouter()
router.register(r'boards', BoardViewSet, basename='board')
router.register(r'notes', NoteViewSet, basename='note')
router.register(r'files', FileItemViewSet, basename='file')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', EmailLoginView.as_view(), name='email-login'),
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('auth/user/', CurrentUserView.as_view(), name='current-user'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
]