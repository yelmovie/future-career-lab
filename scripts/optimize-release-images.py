"""Re-encode runtime images from the preserved release originals (no resizing)."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
report_path = ROOT / 'docs/ASSET-OPTIMIZATION-20260912.json'
report = json.loads(report_path.read_text(encoding='utf-8'))
records = []
for entry in report['images']:
    source = (ROOT / entry['archive']).resolve()
    target = (ROOT / 'public' / entry['runtime'].lstrip('/')).resolve()
    if not source.is_relative_to(ROOT / '_unused') or not target.is_relative_to(ROOT / 'public'):
        raise ValueError('Image path must stay in the project archive/public directories')
    if not source.is_file():
        raise FileNotFoundError(f'Preserved original required: {source}')
    data = source.read_bytes()
    if hashlib.sha256(data).hexdigest() != entry['sourceSha256']:
        raise ValueError(f'Original hash mismatch: {source}')
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as original:
        image = original.convert('RGBA' if 'A' in original.getbands() else 'RGB')
        image.save(target, 'WEBP', quality=90, method=6, exact=True)
        dimensions = image.size
    records.append({**entry, 'width': dimensions[0], 'height': dimensions[1],
                    'afterBytes': target.stat().st_size,
                    'runtimeSha256': hashlib.sha256(target.read_bytes()).hexdigest()})
report['images'] = records
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'count': len(records), 'beforeBytes': sum(x['beforeBytes'] for x in records),
                  'afterBytes': sum(x['afterBytes'] for x in records)}, ensure_ascii=False))
