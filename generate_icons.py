
import sys
from PIL import Image
import os

def create_icon(source_path, size, output_path):
    try:
        img = Image.open(source_path)
        
        # Create square white background
        new_img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        
        # Calculate resize dimensions maintaining aspect ratio
        img.thumbnail((size - 20, size - 20), Image.Resampling.LANCZOS)
        
        # Center the image
        x = (size - img.width) // 2
        y = (size - img.height) // 2
        
        new_img.paste(img, (x, y))
        
        # Save
        new_img.save(output_path, "PNG")
        print(f"Created {output_path}")
        
    except Exception as e:
        print(f"Error creating icon: {e}")

source = r"C:\Users\justi\.gemini\antigravity\brain\6e93473f-1e72-4efb-a00c-db8f2d655276\uploaded_image_1763910219275.png"
dest_dir = r"C:\Users\justi\.gemini\antigravity\scratch\tfi-music\public"

create_icon(source, 192, os.path.join(dest_dir, "app-icon-192.png"))
create_icon(source, 512, os.path.join(dest_dir, "app-icon-512.png"))
