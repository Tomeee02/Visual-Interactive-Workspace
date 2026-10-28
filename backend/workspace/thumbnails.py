"""Thumbnail generation for uploaded documents."""
import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from PIL import Image
from django.conf import settings


THUMBNAIL_DIR = Path(settings.MEDIA_ROOT) / 'thumbnails'
THUMBNAIL_WIDTH = 480
THUMBNAIL_HEIGHT = 640


def ensure_thumbnail_dir():
    """Ensure the thumbnails directory exists."""
    THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)


def generate_pdf_thumbnail(file_path):
    """Generate a thumbnail from the first page of a PDF using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        if doc.page_count == 0:
            doc.close()
            return None

        page = doc[0]
        # Render at a resolution that gives us a nice thumbnail
        # Default DPI is 72, we want ~240px wide
        zoom = THUMBNAIL_WIDTH / page.rect.width * 2  # 2x for quality
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)

        # Convert to PIL Image
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        doc.close()

        # Resize to thumbnail dimensions maintaining aspect ratio
        img.thumbnail((THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT), Image.LANCZOS)

        # Save
        ensure_thumbnail_dir()
        thumb_filename = f"{uuid.uuid4().hex}.png"
        thumb_path = THUMBNAIL_DIR / thumb_filename
        img.save(str(thumb_path), "PNG", quality=90)

        return f"thumbnails/{thumb_filename}"
    except Exception as e:
        print(f"PDF thumbnail generation failed: {e}")
        return None


def generate_docx_thumbnail(file_path):
    """Render the first page of a Word document through LibreOffice."""
    office_executable = _find_office_executable()
    if not office_executable:
        print("Word thumbnail generation skipped: LibreOffice is not installed")
        return None

    try:
        source_path = Path(file_path).resolve()
        with tempfile.TemporaryDirectory(prefix="word-preview-") as temp_directory:
            output_directory = Path(temp_directory)
            profile_directory = output_directory / "profile"
            subprocess.run(
                [
                    office_executable,
                    "--headless",
                    "--nologo",
                    "--nodefault",
                    "--nolockcheck",
                    f"-env:UserInstallation={profile_directory.resolve().as_uri()}",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    str(output_directory),
                    str(source_path),
                ],
                check=True,
                capture_output=True,
                timeout=60,
            )
            pdf_path = output_directory / f"{source_path.stem}.pdf"
            if not pdf_path.is_file():
                raise RuntimeError("LibreOffice did not create the expected PDF")
            return generate_pdf_thumbnail(pdf_path)
    except Exception as e:
        print(f"Word thumbnail generation failed: {e}")
        return None


def _find_office_executable():
    """Find a LibreOffice executable on PATH or in common install locations."""
    for command in ("soffice", "libreoffice"):
        executable = shutil.which(command)
        if executable:
            return executable

    if os.name == "nt":
        for environment_variable in ("PROGRAMFILES", "PROGRAMFILES(X86)"):
            program_files = os.environ.get(environment_variable)
            if not program_files:
                continue
            executable = Path(program_files) / "LibreOffice" / "program" / "soffice.exe"
            if executable.is_file():
                return str(executable)

    return None


def generate_image_thumbnail(file_path):
    """Generate a thumbnail from an image file (JPG, PNG, GIF, WebP, etc.).

    Width is always 240px (matching PDF/DOCX thumbnails).
    Height is calculated from aspect ratio, clamped between 100px and 180px.
    """
    try:
        img = Image.open(file_path)
        img = img.convert("RGB")

        # Always use 240px width, calculate height from aspect ratio
        aspect_ratio = img.height / img.width
        new_height = int(THUMBNAIL_WIDTH * aspect_ratio)

        # Clamp height between 100px (minimum) and 180px (maximum)
        new_height = max(new_height, 100)
        new_height = min(new_height, THUMBNAIL_HEIGHT)

        img = img.resize((THUMBNAIL_WIDTH, new_height), Image.LANCZOS)

        ensure_thumbnail_dir()
        thumb_filename = f"{uuid.uuid4().hex}.png"
        thumb_path = THUMBNAIL_DIR / thumb_filename
        img.save(str(thumb_path), "PNG", quality=90)

        return f"thumbnails/{thumb_filename}"
    except Exception as e:
        print(f"Image thumbnail generation failed: {e}")
        return None


def generate_thumbnail(file_path, filename):
    """Generate a thumbnail based on file type.

    Returns the relative path to the thumbnail within MEDIA_ROOT, or None.
    """
    ext = os.path.splitext(filename)[1].lower()

    if ext == '.pdf':
        return generate_pdf_thumbnail(file_path)
    elif ext in ('.doc', '.docx'):
        return generate_docx_thumbnail(file_path)
    elif ext in ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'):
        return generate_image_thumbnail(file_path)

    return None