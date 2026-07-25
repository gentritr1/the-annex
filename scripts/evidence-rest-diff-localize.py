#!/usr/bin/env python3
"""Localize the rest-frame pixel difference between pre-change (HEAD) and
post-change (3D depth) pristine rest screenshots.

Inputs (evidence/):
  case-77-depth-rest-pristine-before2-1280x800.png   old code, capture B
  case-77-depth-rest-pristine-after2-1280x800.png    new code, capture B
  case-77-depth-rest-pristine-before-1280x800.png    old code, capture A
  case-77-depth-rest-pristine-after-1280x800.png     new code, capture A

Outputs:
  evidence/rest-diff-heatmap-case77.png   amplified abs-diff heatmap (before2 vs after2)
  evidence/rest-diff-noisefloor-after.png amplified abs-diff (after vs after2, same code)
  Console: global stats + per-region stats (plane bands / overlay zones) for
  before->after vs the same-code noise floors.
"""
import numpy as np
from PIL import Image
from pathlib import Path

EV = Path("evidence")
CASE = "case-77"

def load(name):
    p = EV / name
    im = Image.open(p).convert("RGB")
    return np.asarray(im, dtype=np.int16)

def stats(diff, label):
    absd = np.abs(diff)
    maxc = absd.max(axis=2)  # max channel delta per pixel
    total = maxc.size
    print(f"  {label}:")
    print(f"    pixels >2 delta : {(maxc > 2).sum():>8} ({100.0 * (maxc > 2).sum() / total:5.1f}%)")
    print(f"    pixels >8 delta : {(maxc > 8).sum():>8} ({100.0 * (maxc > 8).sum() / total:5.1f}%)")
    print(f"    pixels >32 delta: {(maxc > 32).sum():>8} ({100.0 * (maxc > 32).sum() / total:5.1f}%)")
    print(f"    mean |d| {maxc.mean():6.2f}   p50 {np.percentile(maxc, 50):5.1f}   "
          f"p95 {np.percentile(maxc, 95):5.1f}   p99 {np.percentile(maxc, 99):5.1f}   max {maxc.max()}")
    return maxc

def region_stats(maxc, label):
    # Stage rect is x=20..536, y=150..608 (from measured plane rects: background
    # plane x=20.01 y=150.01 w=515.97 h=457.99). Slice stage into a 6x6 grid and
    # report mean|d| per cell to see whether the difference is uniform (global
    # resampling) or localized (a shifted element).
    x0, y0, x1, y1 = 20, 150, 536, 608
    sub = maxc[y0:y1, x0:x1]
    print(f"  {label} — stage-grid mean|d| (rows=top..bottom, cols=left..right):")
    h, w = sub.shape
    gh, gw = h // 6, w // 6
    for r in range(6):
        row = []
        for c in range(6):
            cell = sub[r * gh:(r + 1) * gh, c * gw:(c + 1) * gw]
            row.append(f"{cell.mean():5.1f}")
        print("    " + " ".join(row))

def heatmap(diff, out):
    absd = np.abs(diff).max(axis=2)
    amp = np.clip(absd * 6, 0, 255).astype(np.uint8)  # 6x amplification
    # colorize: dark = no change, hot = big change
    lut = np.zeros((256, 3), dtype=np.uint8)
    for i in range(256):
        t = i / 255.0
        lut[i] = [int(255 * min(1, t * 2)), int(255 * max(0, min(1, t * 2 - 0.6))), int(40 * (1 - t))]
    rgb = lut[amp]
    Image.fromarray(rgb).save(EV / out)
    print(f"  wrote {EV / out}")

def main():
    b2 = load(f"{CASE}-depth-rest-pristine-before2-1280x800.png")
    a2 = load(f"{CASE}-depth-rest-pristine-after2-1280x800.png")
    b1 = load(f"{CASE}-depth-rest-pristine-before-1280x800.png")
    a1 = load(f"{CASE}-depth-rest-pristine-after-1280x800.png")
    assert b2.shape == a2.shape == b1.shape == a1.shape, (b2.shape, a2.shape, b1.shape, a1.shape)
    print(f"{CASE} rest images shape {b2.shape}")

    print("\n[1] CROSS-CODE: before2 -> after2 (the acceptance-b question)")
    m_cross = stats(a2 - b2, "before2 vs after2")
    region_stats(m_cross, "cross-code")
    heatmap(a2 - b2, "rest-diff-heatmap-case77.png")

    print("\n[2] NOISE FLOOR old code: before vs before2")
    m_bb = stats(b2 - b1, "before vs before2")

    print("\n[3] NOISE FLOOR new code: after vs after2")
    m_aa = stats(a2 - a1, "after vs after2")
    heatmap(a2 - a1, "rest-diff-noisefloor-after.png")

    print("\n[4] Channel means (global brightness/contrast shift check), stage region only")
    x0, y0, x1, y1 = 20, 150, 536, 608
    for name, img in [("before1", b1), ("before2", b2), ("after1", a1), ("after2", a2)]:
        st = img[y0:y1, x0:x1]
        print(f"    {name}: R {st[:,:,0].mean():7.2f}  G {st[:,:,1].mean():7.2f}  B {st[:,:,2].mean():7.2f}")

    print("\n[5] Sign of cross-code delta in stage region (systematic darker/lighter?)")
    d = (a2 - b2)[y0:y1, x0:x1]
    print(f"    mean signed delta R {d[:,:,0].mean():+6.2f}  G {d[:,:,1].mean():+6.2f}  B {d[:,:,2].mean():+6.2f}")

if __name__ == "__main__":
    main()
