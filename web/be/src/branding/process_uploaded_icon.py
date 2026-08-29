import sys
import os
from PIL import Image

def process_image(input_path, output_original_path, output_prepared_path, scale=1.0, offsetX=0.0, offsetY=0.0, padding=0.0):
    try:
        # 1. Open the image
        if not os.path.exists(input_path):
            print(f"Error: Input file does not exist: {input_path}", file=sys.stderr)
            sys.exit(1)
            
        try:
            img = Image.open(input_path)
            img.verify() # Verify file is not corrupt
            img = Image.open(input_path)
        except Exception as ve:
            print(f"Error: Invalid or corrupt image file: {ve}", file=sys.stderr)
            sys.exit(2)
            
        # 2. Check format
        fmt = img.format
        if fmt not in ['PNG', 'JPEG', 'MPO']:
            print(f"Error: Unsupported image format: {fmt}. Only PNG, JPG, and JPEG are allowed.", file=sys.stderr)
            sys.exit(3)
            
        # Convert to RGBA mode
        img = img.convert("RGBA")
        w, h = img.size
        
        # 3. Detect existing transparency
        has_existing_transparency = False
        data = img.load()
        for y in range(0, h, max(1, h // 50)):
            for x in range(0, w, max(1, w // 50)):
                if data[x, y][3] < 255:
                    has_existing_transparency = True
                    break
            if has_existing_transparency:
                break
                
        # 4. Perform background removal using BFS if no transparency is present
        # and corner pixels are near-white (R > 240, G > 240, B > 240)
        if not has_existing_transparency:
            corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
            corners_white = all(data[cx, cy][0] > 240 and data[cx, cy][1] > 240 and data[cx, cy][2] > 240 for cx, cy in corners)
            
            if corners_white:
                visited = set()
                queue = corners.copy()
                for pt in queue:
                    visited.add(pt)
                    
                while queue:
                    x, y = queue.pop(0)
                    r, g, b, a = data[x, y]
                    if r > 240 and g > 240 and b > 240:
                        data[x, y] = (0, 0, 0, 0)
                        # Add neighbors
                        for nx, ny in [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]:
                            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                                visited.add((nx, ny))
                                queue.append((nx, ny))
                                
        # 5. Save the original image as a PNG to output_original_path
        os.makedirs(os.path.dirname(output_original_path), exist_ok=True)
        img.save(output_original_path, "PNG")
        print(f"Original image saved as PNG to {output_original_path}")
        
        # 6. Scale keeping aspect ratio based on scale, padding, and base fitted size
        base_scale = 1024.0 / max(w, h)
        final_scale = base_scale * scale * (1.0 - padding)
        
        new_w = int(w * final_scale)
        new_h = int(h * final_scale)
        
        if new_w < 1: new_w = 1
        if new_h < 1: new_h = 1
        
        resized_logo = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # 7. Create transparent 1024x1024 canvas
        canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        
        # Base centered coordinates
        center_x = (1024 - new_w) // 2
        center_y = (1024 - new_h) // 2
        
        # Apply offsets (in percentages of 1024, so offset * 10.24)
        pixel_offsetX = int(offsetX * 10.24)
        pixel_offsetY = int(offsetY * 10.24)
        
        paste_x = center_x + pixel_offsetX
        paste_y = center_y + pixel_offsetY
        
        # Paste logo on canvas
        canvas.paste(resized_logo, (paste_x, paste_y), resized_logo)
        
        # 8. Save prepared image
        os.makedirs(os.path.dirname(output_prepared_path), exist_ok=True)
        canvas.save(output_prepared_path, "PNG")
        print(f"Prepared image saved to {output_prepared_path}")
        sys.exit(0)
        
    except Exception as e:
        print(f"Error processing image: {e}", file=sys.stderr)
        sys.exit(9)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python process_uploaded_icon.py <input_path> <output_original_path> <output_prepared_path> [scale] [offsetX] [offsetY] [padding]", file=sys.stderr)
        sys.exit(4)
        
    scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    offsetX = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
    offsetY = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
    padding = float(sys.argv[7]) if len(sys.argv) > 7 else 0.0

    process_image(sys.argv[1], sys.argv[2], sys.argv[3], scale, offsetX, offsetY, padding)
