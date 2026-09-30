# Fleet Maintenance API

A Django REST Framework API for offices, vehicles, mechanics and maintenance records. The original brief is in [CHALLENGE.md](CHALLENGE.md).

## Run

Requires Python 3.13.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py runserver 0.0.0.0:8000
```

The API lives at `http://localhost:8000/api/`.

`seed` creates 13 offices, 42 mechanics, 605 vehicles and about 61,000 maintenance records in roughly 4 seconds. The data is the same on every run (`--seed 42`). It refuses to run over existing data unless you pass `--flush`. Five vehicles have 800 records each, to exercise the vehicle details endpoint. It also adds these edge cases:

| Data | Expected result |
|---|---|
| Vehicle `NEVER1` | first in needing-maintenance |
| Vehicles `DUE365`, `DUE366` | only `DUE366` needs maintenance |
| Plate `REUSE1` on an inactive and an active vehicle | allowed |
| Mechanics `Idle Ivy` (active, no work) and `Retired Rex` (inactive, worked this year) | both appear in the workload |
| Office `Empty Lot` | 0 vehicles, 0 cost, no last maintenance |

## Test

```bash
cd backend
python manage.py test
```

The tests need only `requirements.txt`. For the dev tooling, install `requirements-dev.txt` and run:

```bash
coverage run manage.py test && coverage report   # fails below 90%
ruff format --check . && ruff check .
mypy .
```

CI runs these checks on every pull request, and `main` rejects merges that fail them. `lefthook install` adds the same checks as git hooks.

## API

List endpoints accept `?page=`, `?page_size=` (max 100) and `?ordering=`.

| Endpoint | Purpose |
|---|---|
| `/api/offices/`, `/api/vehicles/`, `/api/mechanics/`, `/api/maintenance-records/` | CRUD |
| `GET /api/offices/summary/` | active vehicles, 12-month cost and last maintenance per office |
| `GET /api/vehicles/?office=&is_active=&make=&model=&maintenance_from=&maintenance_to=&mechanic_certification=` | vehicle search |
| `GET /api/vehicles/{id}/` | vehicle with office and full maintenance history |
| `GET /api/vehicles/{id}/maintenance/` | history, newest first, paginated |
| `POST /api/vehicles/{id}/assign/` `{"office": id}` | move a vehicle to another office |
| `GET /api/mechanics/workload/` | this year's jobs and cost per mechanic, busiest first |
| `GET /api/vehicles/needing-maintenance/` | active vehicles never serviced or last serviced over 365 days ago |
| `GET /api/vehicles/duplicate-check/?vin=&license_plate=&exclude=` | `{"conflicts": ["vin", "license_plate"]}` |

Invalid input returns `400` with errors keyed by field. Deleting an office with vehicles, or a vehicle or mechanic with maintenance records, returns `409`:

```json
{"detail": "Cannot delete: it is referenced by 113 maintenance records."}
```

## Assumptions

- A VIN has 17 characters, uppercase letters and digits, without I, O or Q. The API trims and uppercases it.
- The API stores plates as uppercase letters and digits only, so `abc-12 34` becomes `ABC1234`.
- Two active vehicles can't share a plate. An inactive vehicle can keep a plate an active one now uses, but can't be reactivated while it's taken.
- Office names are unique per city.
- A vehicle's year is between 1886 and next year. Maintenance dates can't be in the future.
- "Inactive" means out of service, not deleted. Lists include inactive rows unless you filter with `?is_active=`. Inactive vehicles and mechanics can still get maintenance records.
- `DELETE` removes the row. Maintenance history blocks deleting its vehicle, mechanic or office, so the API returns `409` instead. Maintenance records themselves delete freely.
- The reports use UTC for "today" and "this year", because the offices span several time zones.
- The office summary's 12 months end today and start on the same date last year. Its cost and last maintenance include inactive vehicles. Its vehicle count doesn't.
- In vehicle search, `make` and `model` ignore case. The date range and `mechanic_certification` must match the same maintenance record.
- Assigning a vehicle only changes its office. Assigning it to its current office changes nothing.
- The workload lists active mechanics plus inactive ones who worked this year. It sorts by job count, then cost, then name.
- A vehicle needs maintenance after more than 365 days, so exactly 365 doesn't count. Vehicles never serviced come first.
- The duplicate check compares the VIN against all vehicles and the plate against active ones.

## Trade-offs

- The database enforces every rule it can express, so admin actions and scripts can't skip them. The active-plate rule also lives in the serializer to return a readable 400.
- Amounts are JSON numbers, as in the brief's example. They stay `Decimal` in Python and the database.
- Vehicle details returns the full history in 2 queries. An 800-record vehicle takes about 30 ms but returns about 160 KB. The paginated history endpoint suits clients that want less.
- Reports and writes live in plain functions (`selectors.py`, `services.py`) and take `today` as an argument, so tests call them with fixed dates. CRUD stays on `ModelViewSet`.
- `make` and `model` have no index, because case-insensitive search on SQLite can't use a plain one. A large fleet would need functional indexes on `Upper()`.
- Page-number pagination counts every row. Cursor pagination would avoid that on very large tables.
- There's no authentication, since the brief doesn't require it.
