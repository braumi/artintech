"""
Generate a filled floor texture from a walls-only blueprint image.

Assumptions:
- Input image: white background, black walls (output of remove_interior_lines.py).
- Default floor texture: components/textures/wooden_floor.jpg (tiled).
- Output image: PNG where:
    - walls   = black
    - floor   = tiled wooden texture inside closed wall regions
    - outside = white

Usage:
  python3 scripts/generate_floor_mask.py walls_only.png floor_filled.png
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Tuple

import numpy as np
from PIL import Image, ImageFilter

WALL_THRESHOLD = 40          # 0–255; lower = stricter walls
MIN_FLOOR_AREA_PX = 500      # discard tiny isolated floor pockets
SMOOTH_ITERATIONS = 1        # 0–2 is usually enough


def connected_components(mask: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """4-connected components on a binary mask (1 = foreground)."""
    h, w = mask.shape
    labels = -np.ones_like(mask, dtype=np.int32)
    stats = []
    current = 0
    stack = []

    for y in range(h):
        for x in range(w):
            if mask[y, x] == 0 or labels[y, x] != -1:
                continue
            stack.append((x, y))
            labels[y, x] = current
            area = 0
            min_x = max_x = x
            min_y = max_y = y
            while stack:
                cx, cy = stack.pop()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if nx < 0 or nx >= w or ny < 0 or ny >= h:
                        continue
                    if mask[ny, nx] == 0 or labels[ny, nx] != -1:
                        continue
                    labels[ny, nx] = current
                    stack.append((nx, ny))
            stats.append((min_x, min_y, max_x - min_x + 1, max_y - min_y + 1, area))
            current += 1

    return labels, np.asarray(stats, dtype=np.int32)


def generate_floor_mask(input_path: str, output_path: str) -> None:
    img = Image.open(input_path).convert("L")
    gray = np.array(img, dtype=np.uint8)

    # 1) Binarize walls: dark pixels => wall
    walls = (gray < WALL_THRESHOLD).astype(np.uint8)

    h, w = walls.shape
    # 2) Flood fill from border to mark "outside" region
    outside = np.zeros_like(walls, dtype=np.uint8)
    stack = []

    def push_if_valid(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and walls[y, x] == 0 and outside[y, x] == 0:
            outside[y, x] = 1
            stack.append((x, y))

    # seed with all non‑wall border pixels
    for x in range(w):
        push_if_valid(x, 0)
        push_if_valid(x, h - 1)
    for y in range(h):
        push_if_valid(0, y)
        push_if_valid(w - 1, y)

    while stack:
        cx, cy = stack.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and walls[ny, nx] == 0 and outside[ny, nx] == 0:
                outside[ny, nx] = 1
                stack.append((nx, ny))

    # 3) Candidate floor = not wall and not outside
    floor = ((walls == 0) & (outside == 0)).astype(np.uint8)

    # Remove tiny islands
    labels, stats = connected_components(floor)
    keep = set()
    for idx, (_, _, _, _, area) in enumerate(stats):
        if area >= MIN_FLOOR_AREA_PX:
            keep.add(idx)
    clean = np.zeros_like(floor)
    for idx in keep:
        clean[labels == idx] = 1

    # Optional smoothing (dilate then erode) to close small gaps
    if SMOOTH_ITERATIONS > 0:
        size = 3
        pil = Image.fromarray((clean * 255).astype(np.uint8))
        for _ in range(SMOOTH_ITERATIONS):
            pil = pil.filter(ImageFilter.MaxFilter(size=size))  # dilate
            pil = pil.filter(ImageFilter.MinFilter(size=size))  # erode
        clean = (np.array(pil) > 0).astype(np.uint8)

    # 4) Build a tiled wooden floor texture
    project_root = Path(__file__).resolve().parents[1]
    default_tex = project_root / "components" / "textures" / "wooden_floor.jpg"
    tex_img = Image.open(default_tex).convert("RGB")
    tex_arr = np.array(tex_img)
    th, tw, _ = tex_arr.shape
    reps_y = (h + th - 1) // th
    reps_x = (w + tw - 1) // tw
    tiled = np.tile(tex_arr, (reps_y, reps_x, 1))[:h, :w, :]

    # 5) Compose final image:
    #    walls   => black
    #    floor   => tiled wooden texture
    #    outside => white
    out = np.full((h, w, 3), 255, dtype=np.uint8)  # white background
    out[walls == 1] = (0, 0, 0)
    out[clean == 1] = tiled[clean == 1]

    Image.fromarray(out).save(output_path)
    print(f"Filled floor image saved to: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/generate_floor_mask.py <walls_only.png> <floor_mask.png>")
        sys.exit(1)
    generate_floor_mask(sys.argv[1], sys.argv[2])


