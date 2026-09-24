#!/usr/bin/env python3
"""Generate the Trikal Darshi app icon: golden 4-point star on parchment.

Usage: python gen-icon.py <size> [out_path]
"""
import struct
import sys
import zlib
import math


def png_chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: str, w: int, h: int, pixels: list) -> None:
    raw = b"".join(b"\x00" + bytes(p) for p in pixels)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + png_chunk(b"IDAT", zlib.compress(raw, 9))
        + png_chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def star_distance(px: float, py: float, cx: float, cy: float) -> float:
    """0..1 radial coordinate inside a 4-point star (concave diamond)."""
    dx, dy = abs(px - cx), abs(py - cy)
    # 4-point star: |x|^0.7 + |y|^0.7 <= R  (concave sides)
    return (dx ** 0.7 + dy ** 0.7) / (cx * 0.78 ** 0.7)


def render(size: int, splash: bool = False) -> list:
    cx = cy = size / 2
    R = size * 0.34
    parchment = (251, 246, 234)
    gold_edge = (166, 124, 42)
    gold_core = (232, 190, 102)
    star_dark = (124, 88, 0)
    ink = (22, 34, 63)

    rows = []
    for y in range(size):
        row = []
        for x in range(size):
            if splash:
                # Radial parchment vignette
                d = math.hypot(x - cx, y - cy) / (size * 0.75)
                d = min(1.0, d)
                base = tuple(int(parchment[i] - 5 * d) for i in range(3))
            else:
                base = parchment

            t = star_distance(x, y, cx, cy)
            if t <= 1.0:
                # Vertical gradient on the star, darker tips
                grad = (y / size)
                r = int(gold_core[0] + (star_dark[0] - gold_core[0]) * grad * 0.85)
                g = int(gold_core[1] + (star_dark[1] - gold_core[1]) * grad * 0.85)
                b = int(gold_core[2] + (star_dark[2] - gold_core[2]) * grad * 0.85)
                # Soft edge antialiasing
                edge = min(1.0, (1.0 - t) * 22)
                r, g, b = (int(base[i] + (r - base[i]) * edge) for i in range(3))
                row += [r, g, b, 255]
            elif t <= 1.06:
                # Thin gold ring glow just outside the star
                glow = (1.06 - t) / 0.06 * 0.35
                r = int(base[0] * (1 - glow) + gold_edge[0] * glow)
                g = int(base[1] * (1 - glow) + gold_edge[1] * glow)
                b = int(base[2] * (1 - glow) + gold_edge[2] * glow)
                row += [r, g, b, 255]
            else:
                row += [*base, 255]
        rows.append(row)
    return rows


if __name__ == "__main__":
    size = int(sys.argv[1]) if len(sys.argv) > 1 else 1024
    out = sys.argv[2] if len(sys.argv) > 2 else f"icon-{size}.png"
    splash = "splash" in out
    write_png(out, size, size, render(size, splash=splash))
    print(f"wrote {out} ({size}x{size}, splash={splash})")
