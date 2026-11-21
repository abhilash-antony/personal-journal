# 📔 Private Journal

A self-hosted, encrypted journaling app inspired by Daybook. All data stays local; backups live in a private GitHub repo.

## Quick Start

```bash
cp .env.example .env
# Edit .env and set both SECRET_KEY and FERNET_KEY (see .env.example for generation commands)
docker compose up --build
```

Open http://localhost:3000 — register, then start writing.

## Architecture

```
Journal/
├── backend/            ← FastAPI service (port 8000)
│   ├── app/
│   │   └── main.py     ← all API routes, encryption, file store
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/           ← Next.js (port 3000)
│   ├── src/
│   │   ├── app/        ← App Router pages
│   │   └── components/ ← Timeline, Calendar, Editor, Header, SearchBar
│   └── Dockerfile
├── data/               ← bind-mounted; your encrypted journal lives here
│   ├── entries/<user>/  ← per-user encrypted entry bodies (.enc)
│   ├── index.json      ← unencrypted metadata (for search/filter)
│   └── uploads/        ← optional image attachments
├── .env                ← secrets — NEVER commit
├── .env.example        ← template
├── docker-compose.yml
└── backup.sh           ← push data/ to GitHub
```

## Storage & Encryption

- **Entry bodies** are encrypted with AES-GCM (via `cryptography.Fernet`) before writing to disk. Key = derived from `SECRET_KEY` env var.
- **`index.json`** stores metadata (date, title, tags, mood) in plaintext so search/filter works without decrypting every file.
- Data is stored as **per-user files** inside `./data/entries/` — each entry is one `.enc` file, making it Git-friendly with clean diffs.

## Backup to GitHub

```bash
chmod +x backup.sh
./backup.sh
```

First-time setup:

```bash
git init
git remote add origin git@github.com:your-user/journal-data.git
git add data/ backup.sh .gitignore .env.example README.md
git commit -m "Initial journal setup"
git push -u origin main
```

> ⚠️ `.env` is in `.gitignore`. Losing it means losing access to your journal. Back it up separately (password manager, safe deposit box, etc.).

## Security

- Passwords hashed with bcrypt
- JWT auth (HTTP bearer token, stored in browser `localStorage`)
- Strict user isolation — queries always scoped to `current_user`
- `ALLOW_REGISTRATION=false` in `.env` to close signups after creating your account
- **Both `SECRET_KEY` and `FERNET_KEY` are required** — the app will refuse to start without them. Losing `.env` means losing access to your journal.
