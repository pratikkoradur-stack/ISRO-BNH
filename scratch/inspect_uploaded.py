import os
import glob
from PIL import Image

dest_dir = r"c:\Users\ACER NITROV15\OneDrive\Desktop\ISRO\static\images"
uploaded_files = sorted(glob.glob(os.path.join(dest_dir, "media__*")))

print("Inspection of User Uploaded Files:")
for filepath in uploaded_files:
    filename = os.path.basename(filepath)
    try:
        with Image.open(filepath) as img:
            # Let's check some pixels to determine if it is welcome or dashboard
            w, h = img.size
            img_rgb = img.convert("RGB")
            # Check left and right halves to see brightness distribution
            left_pixels = [img_rgb.getpixel((x, y)) for x in range(10, w//4, 50) for y in range(10, h-10, 50)]
            right_pixels = [img_rgb.getpixel((x, y)) for x in range(3*w//4, w-10, 50) for y in range(10, h-10, 50)]
            
            avg_left = tuple(sum(p[i] for p in left_pixels) // len(left_pixels) for i in range(3))
            avg_right = tuple(sum(p[i] for p in right_pixels) // len(right_pixels) for i in range(3))
            
            print(f"{filename}: Size={img.size}, AvgLeft={avg_left}, AvgRight={avg_right}, SizeBytes={os.path.getsize(filepath)}")
    except Exception as e:
        print(f"Error inspecting {filename}: {e}")
