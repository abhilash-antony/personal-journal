from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv
import os, json, re
from datetime import datetime, timedelta
from typing import Optional, List
from cryptography.fernet import Fernet, InvalidToken
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, Field

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
SECRET_KEY = os.getenv("SECRET_KEY")
FERNET_KEY = os.getenv("FERNET_KEY")

missing = []
if not SECRET_KEY:
    missing.append("SECRET_KEY")
if not FERNET_KEY:
    missing.append("FERNET_KEY")
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}. Set them in .env or docker-compose.yml.")

ALLOW_REGISTRATION = os.getenv("ALLOW_REGISTRATION", "true").lower() == "true"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
DATA_DIR = os.getenv("DATA_DIR", "./data")
ENTRIES_DIR = os.path.join(DATA_DIR, "entries")
INDEX_FILE = os.path.join(DATA_DIR, "index.json")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
os.makedirs(ENTRIES_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Database ──────────────────────────────────────────────────────────────────
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# ── Auth / Crypto ─────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
fernet = Fernet(FERNET_KEY.encode())

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ── Entry Store ───────────────────────────────────────────────────────────────
def load_index() -> List[dict]:
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, "r") as f:
            return json.load(f)
    return []

def save_index(index: List[dict]):
    tmp = INDEX_FILE + ".tmp"
    with open(tmp, "w") as f:
        json.dump(index, f, indent=2)
    os.replace(tmp, INDEX_FILE)

def encrypt_body(plaintext: str) -> str:
    return fernet.encrypt(plaintext.encode()).decode()

def decrypt_body(ciphertext: str) -> str:
    try:
        return fernet.decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        return "[encrypted — cannot decrypt]"

def user_entries_dir(username: str) -> str:
    d = os.path.join(ENTRIES_DIR, username)
    os.makedirs(d, exist_ok=True)
    return d

# ── Pydantic schemas ──────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class EntryCreate(BaseModel):
    title: str = ""
    body: str = ""
    date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    mood: Optional[str] = None
    tags: List[str] = []
    image: Optional[str] = None  # base64 data URL

class EntryUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    date: Optional[str] = None
    mood: Optional[str] = None
    tags: Optional[List[str]] = None

class EntryOut(BaseModel):
    id: str
    title: str
    date: str
    mood: Optional[str]
    tags: List[str]
    preview: str
    created_at: str
    updated_at: str

class SearchParams(BaseModel):
    q: Optional[str] = None
    tag: Optional[str] = None
    mood: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    skip: int = 0
    limit: int = 50

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="Daybook Clone")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/auth/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if not ALLOW_REGISTRATION:
        raise HTTPException(403, "Public registration is disabled")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "Username already taken")
    user = User(username=req.username, hashed_password=pwd_context.hash(req.password))
    db.add(user)
    db.commit()
    return TokenResponse(access_token=create_token(req.username))

@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not pwd_context.verify(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid username or password")
    return TokenResponse(access_token=create_token(user.username))

@app.get("/api/auth/me")
def me(user: User = Depends(get_current_user)):
    return {"username": user.username}

@app.post("/api/entries", response_model=EntryOut)
def create_entry(entry: EntryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    uid = user.username
    edir = user_entries_dir(uid)
    now = datetime.utcnow()
    eid = now.strftime("%Y%m%d%H%M%S%f")
    # save image if provided
    image_filename = None
    if entry.image and entry.image.startswith("data:image"):
        import base64
        header, b64 = entry.image.split(",", 1)
        ext = header.split(";")[0].split("/")[-1]
        image_filename = f"{eid}.{ext}"
        with open(os.path.join(UPLOAD_DIR, image_filename), "wb") as f:
            f.write(base64.b64decode(b64))
    body_cipher = encrypt_body(entry.body)
    body_file = os.path.join(edir, f"{eid}.enc")
    with open(body_file, "w") as f:
        f.write(body_cipher)
    meta = {
        "id": eid,
        "user_id": uid,
        "title": entry.title,
        "date": entry.date,
        "mood": entry.mood,
        "tags": entry.tags,
        "image": image_filename,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    idx = load_index()
    idx.append(meta)
    save_index(idx)
    return EntryOut(
        id=eid, title=entry.title, date=entry.date, mood=entry.mood,
        tags=entry.tags, preview=(entry.body[:200] or "No content"),
        created_at=meta["created_at"], updated_at=meta["updated_at"],
    )

@app.get("/api/entries", response_model=List[EntryOut])
def list_entries(
    q: Optional[str] = None, tag: Optional[str] = None, mood: Optional[str] = None,
    date_from: Optional[str] = None, date_to: Optional[str] = None,
    skip: int = 0, limit: int = 50,
    user: User = Depends(get_current_user),
):
    uid = user.username
    idx = [e for e in load_index() if e["user_id"] == uid]
    if tag:
        idx = [e for e in idx if tag in e.get("tags", [])]
    if mood:
        idx = [e for e in idx if e.get("mood") == mood]
    if date_from:
        idx = [e for e in idx if e["date"] >= date_from]
    if date_to:
        idx = [e for e in idx if e["date"] <= date_to]
    if q:
        ql = q.lower()
        idx = [e for e in idx if ql in e.get("title", "").lower()]
        # body search: decrypt only matching entries
        filtered = []
        for e in idx:
            bf = os.path.join(user_entries_dir(uid), f"{e['id']}.enc")
            if os.path.exists(bf):
                body = decrypt_body(open(bf).read())
                if ql in body.lower():
                    filtered.append(e)
        idx = filtered if q else idx
    idx.sort(key=lambda e: e["date"], reverse=True)
    results = []
    for e in idx[skip:skip + limit]:
        bf = os.path.join(user_entries_dir(uid), f"{e['id']}.enc")
        body = decrypt_body(open(bf).read()) if os.path.exists(bf) else ""
        results.append(EntryOut(
            id=e["id"], title=e.get("title", ""), date=e["date"],
            mood=e.get("mood"), tags=e.get("tags", []),
            preview=(body[:200] or "No content"),
            created_at=e.get("created_at", ""), updated_at=e.get("updated_at", ""),
        ))
    return results

@app.get("/api/entries/{entry_id}", response_model=EntryOut)
def get_entry(entry_id: str, user: User = Depends(get_current_user)):
    uid = user.username
    idx = next((e for e in load_index() if e["id"] == entry_id and e["user_id"] == uid), None)
    if not idx:
        raise HTTPException(404, "Entry not found")
    bf = os.path.join(user_entries_dir(uid), f"{entry_id}.enc")
    body = decrypt_body(open(bf).read()) if os.path.exists(bf) else ""
    return EntryOut(
        id=idx["id"], title=idx.get("title", ""), date=idx["date"],
        mood=idx.get("mood"), tags=idx.get("tags", []),
        preview=(body[:200] or "No content"),
        created_at=idx.get("created_at", ""), updated_at=idx.get("updated_at", ""),
    )

@app.get("/api/entries/{entry_id}/body")
def get_entry_body(entry_id: str, user: User = Depends(get_current_user)):
    uid = user.username
    idx = next((e for e in load_index() if e["id"] == entry_id and e["user_id"] == uid), None)
    if not idx:
        raise HTTPException(404, "Entry not found")
    bf = os.path.join(user_entries_dir(uid), f"{entry_id}.enc")
    body = decrypt_body(open(bf).read()) if os.path.exists(bf) else ""
    return {"body": body}

@app.put("/api/entries/{entry_id}", response_model=EntryOut)
def update_entry(entry_id: str, update: EntryUpdate, user: User = Depends(get_current_user)):
    uid = user.username
    idx = load_index()
    entry = next((i, e) for i, e in enumerate(idx) if e["id"] == entry_id and e["user_id"] == uid)
    if not entry:
        raise HTTPException(404, "Entry not found")
    i, e = entry
    if update.title is not None: e["title"] = update.title
    if update.mood is not None: e["mood"] = update.mood
    if update.tags is not None: e["tags"] = update.tags
    if update.date is not None: e["date"] = update.date
    if update.body is not None:
        bf = os.path.join(user_entries_dir(uid), f"{entry_id}.enc")
        with open(bf, "w") as f:
            f.write(encrypt_body(update.body))
    e["updated_at"] = datetime.utcnow().isoformat()
    save_index(idx)
    bf = os.path.join(user_entries_dir(uid), f"{entry_id}.enc")
    body = decrypt_body(open(bf).read()) if os.path.exists(bf) else ""
    return EntryOut(
        id=e["id"], title=e.get("title", ""), date=e["date"],
        mood=e.get("mood"), tags=e.get("tags", []),
        preview=(body[:200] or "No content"),
        created_at=e.get("created_at", ""), updated_at=e.get("updated_at", ""),
    )

@app.delete("/api/entries/{entry_id}")
def delete_entry(entry_id: str, user: User = Depends(get_current_user)):
    uid = user.username
    idx = [e for e in load_index() if not (e["id"] == entry_id and e["user_id"] == uid)]
    save_index(idx)
    bf = os.path.join(user_entries_dir(uid), f"{entry_id}.enc")
    if os.path.exists(bf):
        os.remove(bf)
    return {"ok": True}

@app.get("/api/export")
def export_entries(format: str = "json", user: User = Depends(get_current_user)):
    uid = user.username
    idx = [e for e in load_index() if e["user_id"] == uid]
    entries = []
    for e in idx:
        bf = os.path.join(user_entries_dir(uid), f"{e['id']}.enc")
        body = decrypt_body(open(bf).read()) if os.path.exists(bf) else ""
        entries.append({**e, "body": body})
    if format == "md":
        lines = []
        for e in entries:
            lines.append(f"# {e.get('title', 'Untitled')}\n")
            lines.append(f"**Date:** {e['date']}  ")
            if e.get("mood"): lines.append(f"**Mood:** {e['mood']}  ")
            if e.get("tags"): lines.append(f"**Tags:** {', '.join(e['tags'])}  \n")
            lines.append(f"\n{e['body']}\n\n---\n")
        return {"content": "\n".join(lines), "filename": f"{uid}-journal.md"}
    return {"content": json.dumps(entries, indent=2), "filename": f"{uid}-journal.json"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
