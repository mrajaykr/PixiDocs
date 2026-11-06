# js/backend/app/pdf-tool.py

from PyPDF2 import PdfReader, PdfWriter, PdfMerger
from PIL import Image
import re
import os


# ---------- PDF UTILITIES ----------

def merge_pdfs(paths, output_path):
    merger = PdfMerger()
    for p in paths:
        merger.append(p)
    with open(output_path, "wb") as f:
        merger.write(f)
    merger.close()


def reorder_pdf_pages(input_path, output_path, order):
    """
    order: list of 0-based page indices in desired order
    """
    reader = PdfReader(input_path)
    writer = PdfWriter()
    for idx in order:
        writer.add_page(reader.pages[idx])
    with open(output_path, "wb") as f:
        writer.write(f)


def split_pdf_ranges(input_path, output_folder, ranges_str: str):
    """
    ranges_str: '1-3,5-7' (1-based) OR 'all'
    Output files: part_1.pdf, part_2.pdf, ...
    """
    reader = PdfReader(input_path)
    total = len(reader.pages)

    os.makedirs(output_folder, exist_ok=True)

    # If 'all' → 1 PDF per page
    if not ranges_str or ranges_str.strip().lower() == "all":
        for i in range(total):
            w = PdfWriter()
            w.add_page(reader.pages[i])
            out = os.path.join(output_folder, f"page_{i+1}.pdf")
            with open(out, "wb") as f:
                w.write(f)
        return

    parts = ranges_str.split(",")
    part_index = 1
    for part in parts:
        part = part.strip()
        m = re.match(r"^(\d+)-(\d+)$", part)
        if not m:
            continue
        start, end = map(int, m.groups())
        start = max(1, start)
        end = min(total, end)
        if start > end:
            continue

        w = PdfWriter()
        for page_idx in range(start - 1, end):
            w.add_page(reader.pages[page_idx])
        out = os.path.join(output_folder, f"part_{part_index}.pdf")
        with open(out, "wb") as f:
            w.write(f)
        part_index += 1


def rotate_pdf(input_path, output_path, angle=90):
    reader = PdfReader(input_path)
    writer = PdfWriter()
    for page in reader.pages:
        page.rotate(angle)
        writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)


def basic_compress_pdf(input_path, output_path):
    """
    Real compression needs Ghostscript; yaha basic re-write + stream compress.
    """
    reader = PdfReader(input_path)
    writer = PdfWriter()
    for page in reader.pages:
        try:
            page.compress_content_streams()
        except Exception:
            pass
        writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)


# ---------- IMAGE UTILITIES ----------

def image_compress(input_path, output_path, quality=60):
    img = Image.open(input_path).convert("RGB")
    img.save(output_path, optimize=True, quality=quality)


def image_resize_half(input_path, output_path):
    img = Image.open(input_path)
    w, h = img.size
    img = img.resize((w // 2, h // 2))
    img.save(output_path)


def image_convert_to_png(input_path, output_path):
    img = Image.open(input_path)
    img.save(output_path, format="PNG")


def image_merge_vertical(paths, output_path):
    imgs = [Image.open(p).convert("RGB") for p in paths]
    widths = [i.width for i in imgs]
    heights = [i.height for i in imgs]
    max_w = max(widths)
    total_h = sum(heights)

    merged = Image.new("RGB", (max_w, total_h), (0, 0, 0))
    y = 0
    for img in imgs:
        merged.paste(img, (0, y))
        y += img.height

    merged.save(output_path, format="JPEG")
