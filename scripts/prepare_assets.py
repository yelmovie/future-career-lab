"""Build lightweight, ASCII-only runtime assets from the supplied source pack."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ASSET_OUT = PUBLIC / "assets"


PAGE_GROUPS = {
    2: ("03_30_58", "03_30_59", "03_31_00", "03_31_01"),
    3: ("03_31_11", "03_31_13", "03_31_14", "03_31_15", "03_31_17", "03_31_18", "03_31_19"),
    4: ("03_31_28",),
    5: ("03_31_39",),
    6: ("03_31_49",),
    7: ("03_31_57", "03_31_58"),
    8: ("03_32_06", "03_32_07", "03_32_08", "03_32_09", "03_32_10", "03_32_12", "03_32_14"),
    9: ("03_32_19", "03_32_20", "03_32_21", "03_32_22", "03_32_23", "03_32_25", "03_32_26", "03_32_27"),
    10: ("03_32_32", "03_32_33", "03_32_35", "03_32_36", "03_32_37", "03_32_38", "03_32_40"),
}

P1_SOURCES = {
    "student": "03_30_45 (1)",
    "mentor": "03_30_47 (3)",
    "keyart": "03_33_11 (1)",
    "logo": "03_33_11 (2)",
    "tagline": "03_33_11 (3)",
    "badge": "03_33_12 (4)",
    "parrot-pair": "03_33_12 (5)",
    "drone": "03_33_12 (6)",
}


def slot_number(path: Path) -> int:
    match = re.search(r"\((\d+)\)\.png$", path.name)
    if not match:
        raise ValueError(f"Cannot read slot number: {path.name}")
    return int(match.group(1))


def convert_image(source: Path, destination: Path, max_side: int = 1280) -> dict[str, object]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.load()
        if max(image.size) > max_side:
            image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        has_alpha = image.mode in ("RGBA", "LA") or "transparency" in image.info
        save_args: dict[str, object] = {"format": "WEBP", "method": 4}
        if has_alpha:
            image = image.convert("RGBA")
            save_args.update({"quality": 88, "alpha_quality": 92, "exact": True})
        else:
            image = image.convert("RGB")
            save_args.update({"quality": 83})
        image.save(destination, **save_args)
        return {
            "width": image.width,
            "height": image.height,
            "hasAlpha": has_alpha,
        }


def add_entry(entries: list[dict[str, object]], asset_id: str, source: Path, relative_out: Path, display: str, page: int | None = None) -> None:
    metadata = convert_image(source, PUBLIC / relative_out)
    entries.append(
        {
            "id": asset_id,
            "page": page,
            "src": "/" + relative_out.as_posix(),
            "kind": "image",
            "display": display,
            "sourceFile": source.name,
            **metadata,
        }
    )


def main() -> None:
    entries: list[dict[str, object]] = []
    source_assets = list((ROOT / "assets").glob("*.png"))

    # Page backgrounds.
    background_files = sorted((ROOT / "background").glob("*.png"), key=slot_number)
    if len(background_files) != 10:
        raise RuntimeError(f"Expected 10 backgrounds, got {len(background_files)}")
    for source in background_files:
        page = slot_number(source)
        add_entry(
            entries,
            f"background.page{page}",
            source,
            Path(f"assets/backgrounds/page-{page:02}.webp"),
            "hero",
            page,
        )

    # Home atomic assets.
    for name, needle in P1_SOURCES.items():
        matches = [path for path in source_assets if needle in path.stem]
        if len(matches) != 1:
            raise RuntimeError(f"P1 mapping {name}: expected one source, got {len(matches)}")
        add_entry(
            entries,
            f"page1.{name}",
            matches[0],
            Path(f"assets/page-01/{name}.webp"),
            "cutout",
            1,
        )

    # Atomic slots P2-P10.
    for page, stamps in PAGE_GROUPS.items():
        matches = [path for path in source_assets if any(stamp in path.name for stamp in stamps)]
        by_slot = {slot_number(path): path for path in matches}
        expected = set(range(1, 11))
        if set(by_slot) != expected:
            raise RuntimeError(f"P{page} slots mismatch: {sorted(by_slot)}")
        for slot, source in sorted(by_slot.items()):
            add_entry(
                entries,
                f"page{page}.slot{slot}",
                source,
                Path(f"assets/page-{page:02}/slot-{slot:02}.webp"),
                "tile" if page >= 5 else "cutout",
                page,
            )

    # Transparent 2D stand-ins for the future GLB integration.
    sample_files = sorted((ROOT / "3d assets").glob("*.png"), key=slot_number)
    if len(sample_files) != 10:
        raise RuntimeError(f"Expected 10 3D sample renders, got {len(sample_files)}")
    for source in sample_files:
        slot = slot_number(source)
        add_entry(
            entries,
            f"sample3d.slot{slot}",
            source,
            Path(f"assets/3d-samples/sample-{slot:02}.webp"),
            "cutout",
        )

    # Audio keeps its original encoding; only runtime paths are normalized.
    bgm_out = PUBLIC / "audio" / "bgm"
    sfx_out = PUBLIC / "audio" / "sfx"
    bgm_out.mkdir(parents=True, exist_ok=True)
    sfx_out.mkdir(parents=True, exist_ok=True)
    for source in (ROOT / "sound").glob("*.mp3"):
        shutil.copy2(source, bgm_out / source.name)
    for source in (ROOT / "sound" / "bfx").glob("*.mp3"):
        shutil.copy2(source, sfx_out / source.name)

    shutil.copy2(ROOT / "og.png", PUBLIC / "og.png")
    manifest = {
        "schemaVersion": 1,
        "contentVersion": "2026.08",
        "modelSlots": [
            {
                "id": "model.parrotHabitat",
                "src": "/assets/models/parrot-habitat.glb",
                "available": False,
                "fallback": "sample3d.slot7",
            }
        ],
        "assets": entries,
    }
    manifest_path = ASSET_OUT / "asset-manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Prepared {len(entries)} images and runtime audio at {PUBLIC}")


if __name__ == "__main__":
    main()
