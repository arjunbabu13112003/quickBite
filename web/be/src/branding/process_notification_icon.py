import sys
import os
from PIL import Image

def process_notification_image(input_path, output_original_path, output_prepared_path):
    try:
        # 1. Open the image
        if not os.path.exists(input_path):
            print(f"Error: Input file does not exist: {input_path}", file=sys.stderr)
            sys.exit(1)
            
        try:
            img = Image.open(input_path)
            img.verify()
            img = Image.open(input_path)
        except Exception as ve:
            print(f"Error: Invalid or corrupt image file: {ve}", file=sys.stderr)
            sys.exit(2)
            
        # 2. Check format
        fmt = img.format
        if fmt not in ['PNG', 'JPEG', 'MPO']:
            print(f"Error: Unsupported image format: {fmt}. Only PNG, JPG, and JPEG are allowed.", file=sys.stderr)
            sys.exit(3)
            
        # Convert to RGBA
        img = img.convert("RGBA")
        w, h = img.size
        
        # 3. Detect existing transparency
        has_transparency = False
        data = img.load()
        for y in range(h):
            for x in range(w):
                if data[x, y][3] < 255:
                    has_transparency = True
                    break
            if has_transparency:
                break
                
        # 4. Perform background removal using BFS if no transparency is present
        # and corner pixels are near-white (R > 240, G > 240, B > 240)
        if not has_transparency:
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
        
        # 6. Extract pure-white silhouette
        total_visible = 0
        white_visible = 0
        for y in range(h):
            for x in range(w):
                r, g, b, a = data[x, y]
                if a > 0:
                    total_visible += 1
                    if r >= 225 and g >= 225 and b >= 225:
                        white_visible += 1
                        
        if total_visible == 0:
            print("Error: Silhouette extraction failed. Image is completely transparent.", file=sys.stderr)
            sys.exit(5)
            
        silhouette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sil_data = silhouette.load()
        
        # Determine if there is a white logo inside a colored background/circle.
        # Threshold: if white pixels exist and make up between 5% and 85% of the visible shape.
        use_white_threshold = (white_visible > 0) and (0.05 <= (white_visible / total_visible) <= 0.85)
        
        for y in range(h):
            for x in range(w):
                r, g, b, a = data[x, y]
                if a > 0:
                    if use_white_threshold:
                        if r >= 225 and g >= 225 and b >= 225:
                            sil_data[x, y] = (255, 255, 255, a)
                    else:
                        sil_data[x, y] = (255, 255, 255, a)
                        
        # 7. Validate bounding box of the extracted shape
        bbox = silhouette.getbbox()
        if not bbox:
            print("Error: Silhouette extraction failed. Extracted mask is blank.", file=sys.stderr)
            sys.exit(6)
            
        bw = bbox[2] - bbox[0]
        bh = bbox[3] - bbox[1]
        if bw < 8 or bh < 8:
            print(f"Error: Extracted foreground shape is too small ({bw}x{bh} px). Minimum size is 8x8 px.", file=sys.stderr)
            sys.exit(7)
            
        # Count non-transparent pixels in cropped area to ensure it's not noise
        cropped = silhouette.crop(bbox)
        cw, ch = cropped.size
        visible_pixels_count = 0
        cropped_data = cropped.load()
        for cy in range(ch):
            for cx in range(cw):
                if cropped_data[cx, cy][3] > 0:
                    visible_pixels_count += 1
                    
        if visible_pixels_count < 30:
            print(f"Error: Extracted foreground shape contains too few visible pixels ({visible_pixels_count}). Minimum is 30.", file=sys.stderr)
            sys.exit(8)
            
        # 8. Scale to fit 70% of the 96x96 canvas (max dimension 68 px)
        target_max = 68
        if cw > ch:
            new_w = target_max
            new_h = int(ch * (target_max / cw))
        else:
            new_h = target_max
            new_w = int(cw * (target_max / ch))
            
        if new_w < 1 or new_h < 1:
            print("Error: Resized silhouette dimensions are invalid.", file=sys.stderr)
            sys.exit(9)
            
        resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Color correction: Ensure anti-aliased edge pixels are pure white (255, 255, 255, alpha)
        resized = resized.convert("RGBA")
        rw, rh = resized.size
        res_data = resized.load()
        for ry in range(rh):
            for rx in range(rw):
                r, g, b, a = res_data[rx, ry]
                if a > 0:
                    res_data[rx, ry] = (255, 255, 255, a)
        
        # 9. Create final 96x96 transparent canvas and paste centered
        canvas = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        paste_x = (96 - new_w) // 2
        paste_y = (96 - new_h) // 2
        canvas.paste(resized, (paste_x, paste_y))
        
        # 10. Final strict validation of the prepared 96x96 image
        canvas_data = canvas.load()
        has_visible = False
        has_transparent = False
        
        for cy in range(96):
            for cx in range(96):
                r, g, b, a = canvas_data[cx, cy]
                if a > 0:
                    has_visible = True
                    # Every visible pixel must be pure white
                    if r != 255 or g != 255 or b != 255:
                        print(f"Error: Prepared icon contains non-white pixel ({r}, {g}, {b}) at ({cx}, {cy}).", file=sys.stderr)
                        sys.exit(10)
                if a < 255:
                    has_transparent = True
                    
        if not has_visible:
            print("Error: Prepared icon is completely blank.", file=sys.stderr)
            sys.exit(11)
        if not has_transparent:
            print("Error: Prepared icon lacks transparent pixels (alpha must contain both transparent and visible pixels).", file=sys.stderr)
            sys.exit(12)
            
        # 11. Save output prepared PNG
        os.makedirs(os.path.dirname(output_prepared_path), exist_ok=True)
        canvas.save(output_prepared_path, "PNG")
        print(f"Prepared notification icon saved successfully to {output_prepared_path}")
        sys.exit(0)
        
    except Exception as e:
        print(f"Error processing notification image: {e}", file=sys.stderr)
        sys.exit(99)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python process_notification_icon.py <input_path> <output_original_path> <output_prepared_path>", file=sys.stderr)
        sys.exit(4)
        
    process_notification_image(sys.argv[1], sys.argv[2], sys.argv[3])
