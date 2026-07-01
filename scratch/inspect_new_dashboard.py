import os
from PIL import Image

src_path = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images\media__1782833080448.jpg"

try:
    with Image.open(src_path) as img:
        print(f"New Dashboard Screenshot: Size={img.size}, Mode={img.mode}, Bytes={os.path.getsize(src_path)}")
except Exception as e:
    print(f"Error: {e}")
