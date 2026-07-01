import pdfplumber
import os

os.makedirs("pdf_pages", exist_ok=True)

pdf = pdfplumber.open(r'BNH 2026.pdf')
for i, page in enumerate(pdf.pages):
    img = page.to_image(resolution=200)
    img.save(f"pdf_pages/page_{i+1}.png")
    print(f"Saved page {i+1}")
pdf.close()
print("Done!")
