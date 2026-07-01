import os
import glob
from PIL import Image

dest_dir = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images"
png_files = sorted(glob.glob(os.path.join(dest_dir, "media_*.png")))

print("Cropping images...")
for filepath in png_files:
    filename = os.path.basename(filepath)
    # Check if this is one of the original 10 references (file sizes correspond to them)
    size = os.path.getsize(filepath)
    # Only crop files from the original reference set (size > 150000 and size < 600000 and 1782824 in name)
    if "1782824" in filename:
        try:
            with Image.open(filepath) as img:
                w, h = img.size
                # Crop right half of the image
                cropped = img.crop((w // 2, 0, w, h))
                cropped_name = f"hero_right_{filename.split('_')[-1]}"
                cropped.save(os.path.join(dest_dir, cropped_name))
                print(f"Cropped right half of {filename} -> {cropped_name}")
        except Exception as e:
            print(f"Error cropping {filename}: {e}")
