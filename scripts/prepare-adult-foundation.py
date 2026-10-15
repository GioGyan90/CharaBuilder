"""Package a dedicated adult foundation from the user's existing GLB-derived reduction.
No adolescent Face vertices or morph offsets are used. This packages the initial
adult source; it does not claim to perform new manual retopology.
"""
from pathlib import Path
import json,gzip,base64
root=Path(__file__).resolve().parents[1];assets=root/'dist/assets/anime'
manifest=json.loads((assets/'imported-00003-manifest.json').read_text())
source=json.loads(gzip.decompress(base64.b64decode(''.join((assets/p).read_text() for p in manifest['parts']))))
source['meshes']=[m for m in source['meshes'] if m['name']=='Face']
source['reference']={**source.get('reference',{}),'baseFamily':'adultMale','sourceAsset':'ComfyUI_00003_.glb','revision':80,'lineage':'Independent adult asset from the user Stone GLB reduction; no VRoid Face vertices. Not new manual retopology.'}
raw=gzip.compress(json.dumps(source,separators=(',',':')).encode(),mtime=0)
(assets/'adult-male-v80.b64').write_text(base64.b64encode(raw).decode())
(assets/'adult-male-manifest.json').write_text(json.dumps({'parts':['adult-male-v80.b64'],'bytes':len(raw),'reference':source['reference']},indent=2))
