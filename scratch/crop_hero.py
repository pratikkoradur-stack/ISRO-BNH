import os
from PIL import Image

src_path = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images\media__1782829576470.jpg"
dest_path = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images\hero_visual_dark.png"

try:
    with Image.open(src_path) as img:
        w, h = img.size
        # Crop the right portion of the screenshot containing the 3D satellite city scan
        # X starts around 40% of width (x=410), Y spans the entire height
        cropped = img.crop((410, 0, w, h))
        cropped.save(dest_path, "PNG")
        print(f"Successfully cropped visual: size={cropped.size} saved to {dest_path}")
except Exception as e:
    print(f"Error cropping: {e}")
