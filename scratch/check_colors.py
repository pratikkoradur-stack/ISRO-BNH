import os
import glob
from PIL import Image

dest_dir = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images"
png_files = sorted(glob.glob(os.path.join(dest_dir, "media_*.png")))

print("Image Color Analysis:")
for filepath in png_files:
    filename = os.path.basename(filepath)
    if os.path.getsize(filepath) > 600000 and "178282" not in filename[:25]:
        # skip screenshots we just generated in our browser verification
        continue
        
    try:
        with Image.open(filepath) as img:
            # Get colors of 4 corners and center
            w, h = img.size
            img_rgb = img.convert("RGB")
            corners = [
                img_rgb.getpixel((10, 10)),
                img_rgb.getpixel((w - 10, 10)),
                img_rgb.getpixel((10, h - 10)),
                img_rgb.getpixel((w - 10, h - 10)),
                img_rgb.getpixel((w // 2, h // 2))
            ]
            avg_corner = tuple(sum(c[i] for c in corners[:4]) // 4 for i in range(3))
            center = corners[4]
            print(f"{filename}: CornerAvg={avg_corner}, Center={center}, Size={img.size}")
    except Exception as e:
        print(f"Error analyzing {filename}: {e}")
