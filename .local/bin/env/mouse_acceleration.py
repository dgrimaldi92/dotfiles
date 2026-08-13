#!/usr/bin/env python3
"""
Generate a Windows-style pointer acceleration curve for Hyprland's libinput
`custom` accel_profile.

Based on the original by yinonburgansky (who implemented the custom accel
profile in libinput) and the Hyprland adaptation by fufexan.
Curve data is Windows' SmoothMouseXCurve / SmoothMouseYCurve, 16.16 fixed point.

Emits Lua (hyprland.lua, 0.55+) by default; --format conf for legacy hyprlang.

Usage:
    ./win-accel.py --dpi 1600                       # print hl.device block
    ./win-accel.py --dpi 1600 --notch 7             # slider one notch right
    ./win-accel.py --dpi 1600 --device my-mouse --apply   # live-test via hyprctl eval
"""

import argparse
import struct
import subprocess
import sys

# Windows mouse-speed slider (1..11) -> speed multiplier. Notch 6 is default.
NOTCH_TO_MULTIPLIER = {
    1: 0.1,
    2: 0.2,
    3: 0.4,
    4: 0.6,
    5: 0.8,
    6: 1.0,
    7: 1.2,
    8: 1.4,
    9: 1.6,
    10: 1.8,
    11: 2.0,
}

# SmoothMouseXCurve: mouse speed in inches/second
X_HEX = ["00000000", "156e0000", "00400100", "29dc0300", "00002800"]
# SmoothMouseYCurve: pointer speed in inches/second
Y_HEX = ["00000000", "fd110100", "00240400", "00fc1200", "00c0bb01"]


def fixed16_16(hex_str: str) -> float:
    """Decode a little-endian 16.16 fixed-point value."""
    return struct.unpack("<i", bytes.fromhex(hex_str))[0] / 0x10000


def build_points(dpi: float, screen_dpi: float, scale: float, multiplier: float):
    """Windows curve -> libinput units.

    x: inches/s          -> device units/ms   (x * dpi / 1000)
    y: inches/s onscreen -> logical px/ms     (y * screen_dpi / 1000 / scale)
    """
    scale_x = dpi / 1000.0
    scale_y = screen_dpi / 1000.0 / scale * multiplier
    return [
        (fixed16_16(xh) * scale_x, fixed16_16(yh) * scale_y)
        for xh, yh in zip(X_HEX, Y_HEX)
    ]


def interpolate(points, x: float) -> float:
    i = 0
    while i < len(points) - 2 and x >= points[i + 1][0]:
        i += 1
    (x0, y0), (x1, y1) = points[i], points[i + 1]
    return ((x - x0) * y1 + (x1 - x) * y0) / (x1 - x0)


def sample(points, count: int):
    """Sample evenly up to the 4th knee, plus two steps into the last segment."""
    step = points[-2][0] / (count - 2)
    ys = [interpolate(points, i * step) for i in range(count)]
    return step, ys


def main() -> int:
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    p.add_argument(
        "--dpi", type=float, default=1000, help="mouse DPI/CPI (default: 1000)"
    )
    p.add_argument(
        "--screen-dpi", type=float, default=96, help="monitor DPI (default: 96)"
    )
    p.add_argument(
        "--scale",
        type=float,
        default=1.0,
        help="Hyprland monitor scale factor (default: 1.0)",
    )
    p.add_argument(
        "--notch",
        type=int,
        default=6,
        choices=sorted(NOTCH_TO_MULTIPLIER),
        help="Windows speed slider position 1-11 (default: 6 = 1.0x)",
    )
    p.add_argument(
        "--points", type=int, default=40, help="curve sample count, 2-63 (default: 40)"
    )
    p.add_argument(
        "--device",
        help="Hyprland device name, from `hyprctl devices`",
        default="razer-razer-deathadder-v2",
    )
    p.add_argument(
        "--format",
        choices=("lua", "conf"),
        default="lua",
        help="output syntax: lua for 0.55+, conf for legacy hyprlang",
    )
    p.add_argument(
        "--apply",
        action="store_true",
        help="apply live via hyprctl eval (requires --device)",
    )
    args = p.parse_args()

    if not 2 <= args.points <= 63:
        p.error("--points must be between 2 and 63 (libinput caps the curve at 64)")
    if args.apply and not args.device:
        p.error("--apply requires --device (run `hyprctl devices` to find the name)")

    points = build_points(
        args.dpi, args.screen_dpi, args.scale, NOTCH_TO_MULTIPLIER[args.notch]
    )
    step, ys = sample(points, args.points)
    values = " ".join(f"{y:.3f}" for y in ys)
    curve = f"custom {step:.10f} {values}"

    name = args.device or "your-device-name"
    lua_block = (
        f'hl.device({{\n    name = "{name}",\n    accel_profile = "{curve}",\n}})'
    )

    if args.format == "lua":
        print(lua_block)
    else:
        print(f"device {{\n    name = {name}\n    accel_profile = {curve}\n}}")

    print(
        f"\n# {args.dpi:g} DPI, {args.screen_dpi:g} screen DPI, scale {args.scale:g}, "
        f"slider notch {args.notch} ({NOTCH_TO_MULTIPLIER[args.notch]}x)",
        file=sys.stderr,
    )
    print(
        f"# gain at slowest tracked speed: {ys[1] / step:.3f} px per count",
        file=sys.stderr,
    )

    if args.apply:
        # 0.55 dropped `hyprctl keyword`; Lua configs are poked via eval.
        subprocess.run(["hyprctl", "eval", lua_block.replace("\n", " ")], check=True)
        print(
            f"# applied to '{args.device}' (runtime only, lost on next reload)",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
