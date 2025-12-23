"""
Wall-only extractor (no OpenCV required).

Replicates the provided OpenCV flow using Pillow + NumPy:
- Otsu binarization (walls => white).
- Morphological opening with a square kernel to drop thin strokes.
- Dilation to reconnect walls.
- Connected-components filter to remove small blobs (furniture/fixtures).

Usage:
  python3 scripts/remove_interior_lines.py <input_image> <output_image>

Defaults mirror the provided script parameters; tune constants below as needed.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Tuple

import numpy as np
from PIL import Image, ImageFilter

# ---------- PARAMETERS (tune once per blueprint style) ----------
MIN_WALL_THICKNESS_PX = 6     # anything thinner is removed
MIN_COMPONENT_AREA_PX = 1200   # remove small objects (furniture)
DILATION_ITERATIONS = 2        # reconnect wall segments
EROSION_ITERATIONS = 6         # thin the final walls
# ---------------------------------------------------------------


def otsu_threshold(gray: np.ndarray) -> int:
    """Compute Otsu threshold for an 8-bit grayscale image."""
    hist, _ = np.histogram(gray, bins=256, range=(0, 256))
    total = gray.size
    sum_total = np.dot(np.arange(256), hist)

    sum_b = 0.0
    w_b = 0.0
    max_var = -1.0
    threshold = 0

    for t in range(256):
        w_b += hist[t]
        if w_b == 0:
            continue
        w_f = total - w_b
        if w_f == 0:
            break
        sum_b += t * hist[t]
        m_b = sum_b / w_b
        m_f = (sum_total - sum_b) / w_f
        var_between = w_b * w_f * (m_b - m_f) ** 2
        if var_between > max_var:
            max_var = var_between
            threshold = t
    return threshold


def connected_components(mask: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """
    Simple 4-connected components on binary mask (1 = foreground).
    Returns labels array (int32) and stats array shaped (n, 5)
    matching OpenCV's CC_STAT_* order: [x, y, w, h, area].
    """
    h, w = mask.shape
    labels = -np.ones_like(mask, dtype=np.int32)
    stats = []
    current = 0
    stack = []

    for y in range(h):
        for x in range(w):
            if mask[y, x] == 0 or labels[y, x] != -1:
                continue
            # flood fill
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
    return labels, np.array(stats, dtype=np.int32)


def remove_interior_lines(input_path: str, output_path: str) -> None:
    img = Image.open(input_path).convert("L")  # grayscale
    gray = np.array(img, dtype=np.uint8)

    # Otsu binarization, invert so walls become white
    t = otsu_threshold(gray)
    binary = (gray < t).astype(np.uint8) * 255  # walls = 255

    # Morphological opening to drop thin strokes
    size = max(1, MIN_WALL_THICKNESS_PX | 1)  # ensure odd size for filters
    opened = Image.fromarray(binary).filter(ImageFilter.MinFilter(size=size))  # erosion
    opened = opened.filter(ImageFilter.MaxFilter(size=size))  # dilation (opening)

    # Dilation to reconnect walls
    dilated = opened
    if DILATION_ITERATIONS > 0:
        for _ in range(DILATION_ITERATIONS):
            dilated = dilated.filter(ImageFilter.MaxFilter(size=size))

    arr = (np.array(dilated) > 0).astype(np.uint8)  # 1 = wall candidate

    labels, stats = connected_components(arr)

    # Keep only sufficiently large components
    keep = set()
    for idx, (_, _, _, _, area) in enumerate(stats):
        if area >= MIN_COMPONENT_AREA_PX:
            keep.add(idx)

    clean = np.zeros_like(arr, dtype=np.uint8)
    for idx in keep:
        clean[labels == idx] = 1

    # Erosion to thin the walls
    thinned = Image.fromarray((clean * 255).astype(np.uint8))
    if EROSION_ITERATIONS > 0:
        erosion_size = max(1, (MIN_WALL_THICKNESS_PX // 2) | 1)  # smaller kernel for thinning
        for _ in range(EROSION_ITERATIONS):
            thinned = thinned.filter(ImageFilter.MinFilter(size=erosion_size))
    clean = (np.array(thinned) > 0).astype(np.uint8)

    # Invert back: walls black on white
    final = (1 - clean) * 255
    Image.fromarray(final.astype(np.uint8), mode="L").save(output_path)
    print(f"Walls-only image saved to: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/remove_interior_lines.py <input_image> <output_image>")
        sys.exit(1)
    remove_interior_lines(sys.argv[1], sys.argv[2])

