import tempfile
from pathlib import Path
from unittest.mock import patch

from django.test import SimpleTestCase

from workspace.thumbnails import generate_docx_thumbnail


class WordThumbnailTests(SimpleTestCase):
    @patch('workspace.thumbnails.generate_pdf_thumbnail')
    @patch('workspace.thumbnails.subprocess.run')
    @patch('workspace.thumbnails._find_office_executable', return_value='soffice')
    def test_word_document_is_converted_to_pdf_before_rendering(
        self, find_office, run_office, render_pdf
    ):
        render_pdf.return_value = 'thumbnails/preview.png'

        def create_converted_pdf(command, **kwargs):
            output_directory = Path(command[command.index('--outdir') + 1])
            source_path = Path(command[-1])
            (output_directory / f'{source_path.stem}.pdf').touch()

        run_office.side_effect = create_converted_pdf

        with tempfile.TemporaryDirectory() as directory:
            source_path = Path(directory) / 'formatted document.docx'
            source_path.touch()
            result = generate_docx_thumbnail(source_path)

        self.assertEqual(result, 'thumbnails/preview.png')
        run_office.assert_called_once()
        command = run_office.call_args.args[0]
        self.assertIn('--headless', command)
        self.assertIn('--convert-to', command)
        self.assertIn('pdf', command)
        render_pdf.assert_called_once()

    @patch('workspace.thumbnails._find_office_executable', return_value=None)
    def test_word_document_has_no_synthetic_fallback(self, find_office):
        self.assertIsNone(generate_docx_thumbnail('document.docx'))