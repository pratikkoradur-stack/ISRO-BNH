import os
import glob
from PIL import Image
import pytesseract

# Set Tesseract path if needed
tesseract_paths = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Users\ACER NITROV15\AppData\Local\Programs\Tesseract-OCR\tesseract.exe',
    r'C:\Users\ACER NITROV15\anaconda3\Library\bin\tesseract.exe'
]
for path in tesseract_paths:
    if os.path.exists(path):
        pytesseract.pytesseract.tesseract_cmd = path
        break

pdf_pages_dir = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\pdf_pages"
png_files = sorted(glob.glob(os.path.join(pdf_pages_dir, "page_*.png")))

for filepath in png_files:
    filename = os.path.basename(filepath)
    print(f"=== OCR for {filename} ===")
    try:
        img = Image.open(filepath)
        text = pytesseract.image_to_string(img)
        print(text)
    except Exception as e:
        print(f"Error OCR-ing {filename}: {e}")
    print("\n" + "="*40 + "\n")
