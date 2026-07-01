import os
import shutil
import glob

temp_dir = r"C:\Users\ACER NITROV15\.gemini\antigravity-ide\brain\eb09d455-895d-4761-b328-c8a0d582e59a\.tempmediaStorage"
dest_dir = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images"

os.makedirs(dest_dir, exist_ok=True)

png_files = glob.glob(os.path.join(temp_dir, "*.png"))
print(f"Found {len(png_files)} PNG files in temp storage.")

for idx, filepath in enumerate(sorted(png_files)):
    filename = os.path.basename(filepath)
    size = os.path.getsize(filepath)
    # Copy with original name
    shutil.copy(filepath, os.path.join(dest_dir, filename))
    print(f"Copied {filename} ({size} bytes)")
