import os
import glob

# Try to use pytesseract for OCR, otherwise print fallback info
try:
    import pytesseract
    from PIL import Image
    # Path to tesseract if needed (default on Windows is often in Program Files)
    # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    has_ocr = True
except ImportError:
    has_ocr = False
    print("pytesseract or PIL is not installed. Let's check alternative image analysis.")

dest_dir = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images"
png_files = sorted(glob.glob(os.path.join(dest_dir, "media_*.png")))

if has_ocr:
    for filepath in png_files:
        try:
            filename = os.path.basename(filepath)
            img = Image.open(filepath)
            text = pytesseract.image_to_string(img)
            # Clean up text
            words = [w.strip() for w in text.split() if w.strip()]
            preview = " ".join(words[:15])
            print(f"{filename}: OCR text preview -> {preview}")
        except Exception as e:
            print(f"Error OCR-ing {filename}: {e}")
else:
    # If no OCR library, print image details and first few bytes/metadata
    from PIL import Image
    for filepath in png_files:
        filename = os.path.basename(filepath)
        with Image.open(filepath) as img:
            print(f"{filename}: Size={img.size}, Mode={img.mode}")
