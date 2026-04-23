"""Thumbnail generation for uploaded documents."""
import os
import uuid
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
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
    """Generate a thumbnail from a DOCX file.

    Renders the text content as an image preview.
    """
    try:
        from docx import Document
        doc = Document(file_path)

        # Render text content as an image
        text_lines = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                text_lines.append(text)
            if len(text_lines) >= 25:  # Enough lines for a preview
                break

        if not text_lines:
            return None

        return _render_text_thumbnail(text_lines)
    except Exception as e:
        print(f"DOCX thumbnail generation failed: {e}")
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


def _render_text_thumbnail(text_lines):
    """Render text lines as a document-like thumbnail image."""
    try:
        width = THUMBNAIL_WIDTH
        height = THUMBNAIL_HEIGHT

        # Create a white background with slight shadow effect
        img = Image.new("RGB", (width, height), "#FFFFFF")
        draw = ImageDraw.Draw(img)

        # Draw a subtle border
        draw.rectangle([0, 0, width - 1, height - 1], outline="#E5E7EB", width=1)

        # Try to use a reasonable font, fall back to default
        font_size = 10
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
        except (IOError, OSError):
            font = ImageFont.load_default()
            title_font = font

        y_offset = 14
        x_margin = 12

        # Render the first line as a "title" (bold, larger)
        if text_lines:
            title = text_lines[0][:40]
            draw.text((x_margin, y_offset), title, fill="#1F2937", font=title_font)
            y_offset += 20

        # Render remaining lines as body text
        for line in text_lines[1:]:
            if y_offset > height - 20:
                break
            # Wrap long lines
            wrapped = line[:45]
            draw.text((x_margin, y_offset), wrapped, fill="#4B5563", font=font)
            y_offset += 14

        ensure_thumbnail_dir()
        thumb_filename = f"{uuid.uuid4().hex}.png"
        thumb_path = THUMBNAIL_DIR / thumb_filename
        img.save(str(thumb_path), "PNG", quality=90)
        return f"thumbnails/{thumb_filename}"
    except Exception as e:
        print(f"Text thumbnail rendering failed: {e}")
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