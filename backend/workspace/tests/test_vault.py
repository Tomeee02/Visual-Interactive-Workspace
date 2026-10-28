import uuid

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from workspace.models import VaultEntry


class VaultApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='one@example.com', password='test-pass')
        self.other_user = User.objects.create_user(username='two@example.com', password='test-pass')
        self.config = {
            'crypto_version': 1,
            'kdf': {'name': 'argon2id', 'salt': 'c2FsdA=='},
            'master_wrapped_key': {'ciphertext': 'bWFzdGVy', 'nonce': 'bm9uY2U='},
            'recovery_wrapped_key': {'ciphertext': 'cmVjb3Zlcnk=', 'nonce': 'bm9uY2U='},
        }

    def test_vault_entries_are_owner_scoped_and_opaque(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post('/api/vault/', self.config, format='json').status_code, 201)
        secret = 'never-store-this-in-plaintext'
        requested_id = uuid.uuid4()
        response = self.client.post('/api/vault-entries/', {
            'id': str(requested_id),
            'ciphertext': 'ZW5jcnlwdGVk',
            'nonce': 'dW5pcXVlLW5vbmNl',
            'crypto_version': 1,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertNotIn(secret, response.content.decode())
        self.assertFalse(VaultEntry.objects.filter(ciphertext__contains=secret).exists())
        entry_id = response.json()['id']
        self.assertEqual(entry_id, str(requested_id))

        self.client.force_authenticate(self.other_user)
        self.assertEqual(self.client.get('/api/vault-entries/').json()['results'], [])
        self.assertEqual(self.client.get(f'/api/vault-entries/{entry_id}/').status_code, 404)

    def test_vault_setup_is_single_use_and_revision_is_checked(self):
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/vault/', self.config, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.client.post('/api/vault/', self.config, format='json').status_code, 409)
        self.assertEqual(self.client.patch('/api/vault/', {'revision': 99}, format='json').status_code, 409)

    def test_bulk_import_uses_static_route(self):
        self.client.force_authenticate(self.user)
        self.client.post('/api/vault/', self.config, format='json')
        response = self.client.post('/api/vault-entries/bulk/', {'entries': [{
            'id': str(uuid.uuid4()),
            'ciphertext': 'ZW5jcnlwdGVk',
            'nonce': 'dW5pcXVlLW5vbmNl',
            'crypto_version': 1,
        }]}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(VaultEntry.objects.filter(owner=self.user).count(), 1)

    def test_vault_requires_authentication(self):
        self.assertIn(self.client.get('/api/vault/').status_code, [401, 403])
        self.assertIn(self.client.get('/api/vault-entries/').status_code, [401, 403])