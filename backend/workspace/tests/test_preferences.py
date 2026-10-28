from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from workspace.views import voice_supports_language


class SpeechVoiceLanguageTests(APITestCase):
    class Voice:
        def __init__(self, voice_id, name, languages):
            self.id = voice_id
            self.name = name
            self.languages = languages

    def test_hungarian_voice_is_detected_from_windows_voice_id(self):
        voice = self.Voice(
            r'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech\Voices\Tokens\TTS_MS_HU-HU_SZABOLCS_11.0',
            'Microsoft Szabolcs Desktop',
            [],
        )

        self.assertTrue(voice_supports_language(voice, 'hu'))
        self.assertFalse(voice_supports_language(voice, 'en'))

    def test_hungarian_voice_is_detected_from_windows_lcid(self):
        voice = self.Voice('voice-id', 'Microsoft Szabolcs Desktop', [b'0x040e'])

        self.assertTrue(voice_supports_language(voice, 'hu'))


class UserPreferenceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='planner@example.com', password='test-pass')
        self.client.force_authenticate(self.user)

    def test_planner_modules_are_saved_without_being_overwritten_by_tracker(self):
        modules = [
            {'id': 'dailyTracker', 'visibility': {'personal': True, 'work': False}},
            {'id': 'tasks', 'visibility': {'personal': False, 'work': True}},
            {'id': 'fourteenDayTracker', 'visibility': {'personal': False, 'work': False}},
        ]

        response = self.client.patch('/api/preferences/', {
            'plannerModules': modules,
            'plannerView': 'work',
        }, format='json')
        self.assertEqual(response.status_code, 200)

        self.client.patch('/api/preferences/', {'trackerState': {'habits': []}}, format='json')
        preferences = self.client.get('/api/preferences/').json()
        self.assertEqual(preferences['plannerModules'], modules)
        self.assertEqual(preferences['plannerView'], 'work')

    def test_planner_modules_reject_unknown_or_duplicate_modules(self):
        response = self.client.patch('/api/preferences/', {'plannerModules': [
            {'id': 'tasks', 'visibility': {'personal': True, 'work': True}},
            {'id': 'tasks', 'visibility': {'personal': False, 'work': False}},
            {'id': 'unknown', 'visibility': {'personal': True, 'work': True}},
        ]}, format='json')

        self.assertEqual(response.status_code, 400)

    def test_planner_view_rejects_unknown_values(self):
        response = self.client.patch('/api/preferences/', {'plannerView': 'shared'}, format='json')
        self.assertEqual(response.status_code, 400)