# Deliverables

Each item the brief in [CHALLENGE.md](CHALLENGE.md) asks for, and where to find it.

| Deliverable | Where |
|---|---|
| Source code | [`backend/`](backend) (Django + DRF) and [`frontend/`](frontend) (Next.js + MUI) |
| Database migrations | [`backend/fleet/migrations/`](backend/fleet/migrations) |
| Management command with dummy data | `python manage.py seed`: [`backend/fleet/management/commands/seed.py`](backend/fleet/management/commands/seed.py), generator in [`backend/fleet/seeding.py`](backend/fleet/seeding.py) |
| How to run the project | [README → Run](README.md#run) |
| How to run the tests | [README → Test](README.md#test) |
| Assumptions | [README → Assumptions](README.md#assumptions) |
| Trade-offs | [README → Trade-offs](README.md#trade-offs) |
| Frontend demo video (1:24) | [`docs/demo.mp4`](docs/demo.mp4) |

## Demo video

https://github.com/user-attachments/assets/0d45eacb-d843-4a89-b141-8122f5990b03

1920×1080, 1:24, with narration. The same file is committed as [`docs/demo.mp4`](docs/demo.mp4). It runs the frontend against the seeded API:

1. Vehicle search with filters stored in the URL, removable filter chips and a copyable link.
2. A vehicle's detail page with its office, totals and full 800-record history.
3. Adding a maintenance record and moving the vehicle to another office.
4. The back link returning to the same search.
5. The office summary, and a blocked office delete explained in a toast.
6. The mechanics workload ranking.
