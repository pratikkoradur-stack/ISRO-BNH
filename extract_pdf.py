import pdfplumber

pdf = pdfplumber.open(r'BNH 2026.pdf')
for i, page in enumerate(pdf.pages):
    text = page.extract_text()
    if text:
        print(f"--- Page {i+1} ---")
        print(text)
        print()
    else:
        print(f"--- Page {i+1} --- [Image-based slide, no extractable text]")
        print()
pdf.close()
