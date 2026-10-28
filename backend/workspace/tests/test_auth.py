from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework.test import APITestCase


class GoogleLoginPermissionTests(APITestCase):
    @patch('workspace.views.verify_google_id_token')
    def test_new_google_user_has_no_admin_permissions(self, verify_token):
        verify_token.return_value = {'email': 'new-user@example.com'}

        response = self.client.post('/api/auth/google/', {'id_token': 'test-token'}, format='json')

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(username='new-user@example.com')
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.has_usable_password())

    @patch('workspace.views.verify_google_id_token')
    def test_existing_google_user_keeps_admin_permissions(self, verify_token):
        user = User.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            is_staff=True,
            is_superuser=True,
        )
        verify_token.return_value = {'email': user.email}

        response = self.client.post('/api/auth/google/', {'id_token': 'test-token'}, format='json')

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
