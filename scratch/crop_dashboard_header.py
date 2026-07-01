import os
from PIL import Image

src_path = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images\media__1782833080448.jpg"
dest_path = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images\dashboard_header_visual.png"

try:
    with Image.open(src_path) as img:
        # Crop the upper-right header portion of the dashboard screenshot
        # x starts at 450, y from 0 to 215
        cropped = img.crop((450, 0, 1024, 215))
        cropped.save(dest_path, "PNG")
        print(f"Successfully cropped dashboard header visual: size={cropped.size} saved to {dest_path}")
except Exception as e:
    print(f"Error cropping dashboard header: {e}")
