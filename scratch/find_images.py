import os
from PIL import Image

dest_dir = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images"
images = sorted(os.listdir(dest_dir))

print("Image Files Details:")
for img_name in images:
    if img_name.endswith(".png"):
        path = os.path.join(dest_dir, img_name)
        try:
            with Image.open(path) as img:
                print(f"{img_name}: Size={img.size}, Mode={img.mode}, Bytes={os.path.getsize(path)}")
        except Exception as e:
            print(f"Error opening {img_name}: {e}")
