import json
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import RequestFactory, SimpleTestCase
from rest_framework.test import force_authenticate

from workspace.views import LinkPreviewView


class LinkPreviewTests(SimpleTestCase):
    @patch('workspace.views.url_request.urlopen')
    def test_youtube_uses_oembed_thumbnail(self, mock_urlopen):
        mock_response = Mock()
        mock_response.read.return_value = json.dumps({
            'title': 'Example video',
            'thumbnail_url': 'https://i.ytimg.com/vi/example/hqdefault.jpg',
        }).encode('utf-8')
        mock_urlopen.return_value = mock_response

        request = RequestFactory().get(
            '/api/link-preview/',
            {'url': 'https://www.youtube.com/watch?v=example'},
        )
        force_authenticate(request, user=User(username='test'))

        response = LinkPreviewView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['title'], 'Example video')
        self.assertEqual(response.data['image'], 'https://i.ytimg.com/vi/example/hqdefault.jpg')
        self.assertIn('youtube.com/oembed', mock_urlopen.call_args.args[0].full_url)