import tempfile

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from workspace.models import Board, FileItem


class FileItemApiTests(APITestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.media_override = override_settings(MEDIA_ROOT=self.media_directory.name)
        self.media_override.enable()
        self.user = User.objects.create_user(username='files@example.com', password='test-pass')
        self.other_user = User.objects.create_user(username='other-files@example.com', password='test-pass')
        self.board = Board.objects.create(id='documents', title='Documents', owner=self.user)
        self.client.force_authenticate(self.user)

    def tearDown(self):
        self.media_override.disable()
        self.media_directory.cleanup()

    def test_upload_assigns_authenticated_owner(self):
        response = self.client.post('/api/files/', {
            'id': 'uploaded-file',
            'board_id': self.board.id,
            'filename': 'document.txt',
            'file': SimpleUploadedFile('document.txt', b'document content'),
            'file_size': 16,
            'x': 10,
            'y': 20,
        }, format='multipart')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(FileItem.objects.get(pk='uploaded-file').owner, self.user)

    def test_board_file_count_and_items_are_owner_scoped(self):
        FileItem.objects.create(
            id='own-file', board_id=self.board.id, filename='own.txt',
            file='uploads/own.txt', owner=self.user,
        )
        FileItem.objects.create(
            id='other-file', board_id=self.board.id, filename='other.txt',
            file='uploads/other.txt', owner=self.other_user,
        )
        FileItem.objects.create(
            id='ownerless-file', board_id=self.board.id, filename='ownerless.txt',
            file='uploads/ownerless.txt', owner=None,
        )

        response = self.client.get(f'/api/boards/{self.board.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['file_count'], 1)
        self.assertEqual(response.json()['items'], ['own-file'])