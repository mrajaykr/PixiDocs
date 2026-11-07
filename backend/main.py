# js/backend/app/main.py

import os
import uuid
import shutil

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from pdf_tool import (
    merge_pdfs,
    reorder_pdf_pages,
    split_pdf_ranges,
    rotate_pdf,
    basic_compress_pdf,
    image_compress,
    image_resize_half,
    image_convert_to_png,
    image_merge_vertical,
)
from enhance import enhance_image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMP_DIR = os.path.join(BASE_DIR, "..", "..", "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

app = FastAPI()

# CORS for frontend (localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _save_upload(file: UploadFile) -> str:
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    path = os.path.join(TEMP_DIR, filename)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return path


# ---------- PDF ENDPOINTS ----------

@app.post("/pdf/merge")
async def pdf_merge(files: list[UploadFile] = File(...)):
    paths = [_save_upload(f) for f in files]
    out_path = os.path.join(TEMP_DIR, f"merged_{uuid.uuid4().hex}.pdf")
    merge_pdfs(paths, out_path)
    return FileResponse(out_path, filename="merged.pdf")


@app.post("/pdf/reorder")
async def pdf_reorder(file: UploadFile = File(...), order: str = Form(...)):
    """
    order: comma-separated 0-based indices e.g. "0,2,1"
    """
    input_path = _save_upload(file)
    indices = [int(x) for x in order.split(",") if x.strip().isdigit()]
    out_path = os.path.join(TEMP_DIR, f"reordered_{uuid.uuid4().hex}.pdf")
    reorder_pdf_pages(input_path, out_path, indices)
    return FileResponse(out_path, filename="reordered.pdf")


@app.post("/pdf/split")
async def pdf_split(file: UploadFile = File(...), ranges: str = Form("all")):
    """
    ranges: "1-3,5-7" or "all".
    Returns a ZIP of parts.
    """
    import zipfile

    input_path = _save_upload(file)
    folder = os.path.join(TEMP_DIR, f"split_{uuid.uuid4().hex}")
    os.makedirs(folder, exist_ok=True)

    split_pdf_ranges(input_path, folder, ranges)

    zip_path = os.path.join(TEMP_DIR, f"split_{uuid.uuid4().hex}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name in os.listdir(folder):
            full = os.path.join(folder, name)
            zf.write(full, arcname=name)

    shutil.rmtree(folder, ignore_errors=True)
    return FileResponse(zip_path, filename="split_parts.zip")


@app.post("/pdf/rotate")
async def pdf_rotate(file: UploadFile = File(...), angle: int = Form(90)):
    input_path = _save_upload(file)
    out_path = os.path.join(TEMP_DIR, f"rotated_{uuid.uuid4().hex}.pdf")
    rotate_pdf(input_path, out_path, angle)
    return FileResponse(out_path, filename="rotated.pdf")


@app.post("/pdf/compress")
async def pdf_compress(file: UploadFile = File(...)):
    input_path = _save_upload(file)
    out_path = os.path.join(TEMP_DIR, f"compressed_{uuid.uuid4().hex}.pdf")
    basic_compress_pdf(input_path, out_path)
    return FileResponse(out_path, filename="compressed.pdf")


# ---------- IMAGE ENDPOINTS ----------

@app.post("/image/action")
async def image_action(file: UploadFile = File(...), action: str = Form("compress")):
    input_path = _save_upload(file)
    ext = ".jpg"
    if action == "convert":
        ext = ".png"
    out_path = os.path.join(TEMP_DIR, f"img_{uuid.uuid4().hex}{ext}")

    if action == "compress":
        image_compress(input_path, out_path)
    elif action == "resize":
        image_resize_half(input_path, out_path)
    elif action == "convert":
        image_convert_to_png(input_path, out_path)
    else:
        shutil.copy(input_path, out_path)

    return FileResponse(out_path, filename=os.path.basename(out_path))


@app.post("/image/merge")
async def image_merge(files: list[UploadFile] = File(...)):
    paths = [_save_upload(f) for f in files]
    out_path = os.path.join(TEMP_DIR, f"merged_{uuid.uuid4().hex}.jpg")
    image_merge_vertical(paths, out_path)
    return FileResponse(out_path, filename="merged-images.jpg")


# ---------- AI ENHANCE ----------

@app.post("/ai/enhance")
async def ai_enhance(file: UploadFile = File(...)):
    input_path = _save_upload(file)
    out_path = os.path.join(TEMP_DIR, f"enhanced_{uuid.uuid4().hex}.jpg")
    enhance_image(input_path, out_path)
    return FileResponse(out_path, filename="enhanced.jpg")
