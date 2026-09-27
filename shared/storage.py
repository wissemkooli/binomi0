import json, os, tempfile
from pathlib import Path
from threading import Lock
from uuid import uuid4
from filelock import FileLock

ROOT=Path(__file__).resolve().parent.parent
DATA_DIR=ROOT/"data"; DATA_DIR.mkdir(parents=True,exist_ok=True)
ENTITIES={k:DATA_DIR/f"{k}.json" for k in ["users","questionnaires","matches","negotiation_logs"]}
_locks={k:Lock() for k in ENTITIES}
for p in ENTITIES.values():
    if not p.exists(): p.write_text("[]",encoding="utf-8")

def _path(entity):
    if entity not in ENTITIES: raise ValueError(f"Unknown storage entity: {entity}")
    return ENTITIES[entity]

def read_all(entity):
    p=_path(entity)
    with _locks[entity],FileLock(str(p)+".lock"):
        try: return json.loads(p.read_text(encoding="utf-8") or "[]")
        except (json.JSONDecodeError,OSError): return []

def _write(entity,data):
    p=_path(entity); fd,tmp=tempfile.mkstemp(prefix=f".{p.stem}.",suffix=".tmp",dir=p.parent)
    try:
        with os.fdopen(fd,"w",encoding="utf-8") as f:
            json.dump(data,f,ensure_ascii=False,indent=2); f.flush(); os.fsync(f.fileno())
        os.replace(tmp,p)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

def create(entity,payload):
    item={**payload,"id":payload.get("id",str(uuid4()))}
    with _locks[entity],FileLock(str(_path(entity))+".lock"):
        data=json.loads(_path(entity).read_text(encoding="utf-8") or "[]"); data.append(item); _write(entity,data)
    return item

def get(entity,item_id):
    return next((x for x in read_all(entity) if x.get("id")==item_id),None)

def update(entity,item_id,changes):
    with _locks[entity],FileLock(str(_path(entity))+".lock"):
        data=json.loads(_path(entity).read_text(encoding="utf-8") or "[]")
        for item in data:
            if item.get("id")==item_id:
                item.update(changes); _write(entity,data); return item
    return None

def find_one(entity,**criteria):
    return next((x for x in read_all(entity) if all(x.get(k)==v for k,v in criteria.items())),None)

def upsert(entity,criteria,payload):
    old=find_one(entity,**criteria)
    return update(entity,old["id"],payload) if old else create(entity,{**criteria,**payload})
