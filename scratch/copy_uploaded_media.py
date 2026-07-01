import os
import shutil
import glob

source_dir = r"C:\Users\ACER NITROV15\.gemini\antigravity-ide\brain\eb09d455-895d-4761-b328-c8a0d582e59a"
dest_dir = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images"

os.makedirs(dest_dir, exist_ok=True)

# Copy all files matching media__*
uploaded_files = glob.glob(os.path.join(source_dir, "media__*"))
print(f"Found {len(uploaded_files)} user uploaded media files.")

for filepath in sorted(uploaded_files):
    filename = os.path.basename(filepath)
    shutil.copy(filepath, os.path.join(dest_dir, filename))
    print(f"Copied {filename} to static/images/")
