# Fleet Maintenance API

REST API for a fleet of vehicles, the offices they belong to, the mechanics who service them and their maintenance history. Built with Django 5.2 and Django REST Framework.

The original brief is in [CHALLENGE.md](CHALLENGE.md).

## Running the project

Requires Python 3.13.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed          # optional: realistic sample data, see below
python manage.py runserver 0.0.0.0:8000
```

The API is at `http://localhost:8000/api/` (JSON by default, and browsable in a web browser). The Django admin is at `/admin/` (`python manage.py createsuperuser` first).

### Sample data

```bash
python manage.py seed
# Seeded 13 offices, 42 mechanics, 605 vehicles, 61330 maintenance records in 4.2s.
```

- Uses Faker for names, cities and plates, with a fixed seed (`--seed 42`), so everyone gets the same data.
- Large on purpose: up to 200 records per vehicle, plus 5 vehicles with 800 records each, to exercise the vehicle details endpoint.
- Refuses to run if fleet data already exists; `--flush` replaces it.
- Sizes are adjustable: `--offices`, `--mechanics`, `--vehicles`, `--max-records`, `--heavy-vehicles`, `--heavy-records`.

On top of the random data it always creates these edge cases, useful when trying the reports by hand:

| Data | What it shows |
|---|---|
| Vehicle `NEVER1` | never serviced: first in needing-maintenance |
| Vehicles `DUE365` / `DUE366` | last serviced exactly 365 / 366 days ago: only `DUE366` needs maintenance |
| Two vehicles with plate `REUSE1`, one inactive | inactive vehicles may reuse an active vehicle's plate |
| Mechanic `Idle Ivy` (active, no work) and `Retired Rex` (inactive, worked this year) | who appears in the workload report |
| Office `Empty Lot` | summary row for an office with no vehicles |

## Running the tests

```bash
cd backend
python manage.py test
```

Tests need only the runtime requirements. For coverage and the rest of the development tooling:

```bash
pip install -r requirements-dev.txt
coverage run manage.py test && coverage report    # fails below 90% branch coverage
ruff format --check . && ruff check .              # lint (every ruff rule enabled)
mypy .                                             # strict type checking with django-stubs
```

The same checks run in GitHub Actions on every pull request, and `main` only accepts merges when they pass. [lefthook](https://github.com/evilmartians/lefthook) (`lefthook install` from the repo root) runs ruff on commit and mypy plus tests on push.

## API

All endpoints are under `/api/`. List endpoints are paginated (`?page=`, `?page_size=` up to 100) and accept `?ordering=` on the listed fields.

### CRUD

| Resource | Endpoint | List filters and ordering |
|---|---|---|
| Offices | `/api/offices/` | `ordering`: `name`, `city` |
| Vehicles | `/api/vehicles/` | search filters below; `ordering`: `vin`, `license_plate`, `make`, `model`, `year` |
| Mechanics | `/api/mechanics/` | `is_active`; `ordering`: `name`, `certification_number` |
| Maintenance records | `/api/maintenance-records/` | `ordering`: `performed_on`, `cost` |

Each supports `GET` (list and detail), `POST`, `PUT`, `PATCH` and `DELETE`.

### Reports and actions

| # | Endpoint | Description |
|---|---|---|
| 2 | `GET /api/offices/summary/` | every office with active vehicle count, maintenance cost over the last 12 months, and last maintenance date |
| 3 | `GET /api/vehicles/?office=&is_active=&make=&model=&maintenance_from=&maintenance_to=&mechanic_certification=` | vehicle search; any combination of filters |
| 4 | `GET /api/vehicles/{id}/` | vehicle with its office and complete maintenance history, including each record's mechanic |
| 5 | `GET /api/vehicles/{id}/maintenance/` | the vehicle's maintenance history, newest first, paginated |
| 6 | `POST /api/vehicles/{id}/assign/` with `{"office": <id>}` | move the vehicle to another office |
| 7 | `GET /api/mechanics/workload/` | mechanics with job count and cost for the current year, busiest first |
| 8 | `GET /api/vehicles/needing-maintenance/` | active vehicles never serviced or last serviced more than 365 days ago, oldest first |
| 9 | `GET /api/vehicles/duplicate-check/?vin=&license_plate=&exclude=` | `{"conflicts": ["vin", "license_plate"]}` for existing conflicting vehicles |

Example, office summary:

```json
[
  {
    "id": 24,
    "name": "Cassandraton Hub",
    "city": "Cassandraton",
    "active_vehicle_count": 50,
    "maintenance_cost_last_year": 1096191.8,
    "last_maintenance": "2026-09-30"
  }
]
```

### Errors

| Status | When | Example body |
|---|---|---|
| `400` | invalid input or query parameters | `{"license_plate": ["An active vehicle with this license plate already exists."]}` |
| `404` | unknown id | `{"detail": "No Vehicle matches the given query."}` |
| `409` | deleting a record other data depends on | `{"detail": "Cannot delete: it is referenced by 113 maintenance records."}` |

Validation errors are keyed by field, so a form can show each message next to its input.

## Assumptions

**Identity and validation**
- **VIN:** exactly 17 characters, uppercase letters and digits, without I, O or Q (ISO 3779). The North American check digit isn't validated, because non-US VINs don't have one.
- **Input cleanup:** VINs are trimmed and uppercased. Plates are uppercased and stripped of anything that isn't A–Z or 0–9, so `abc-12 34` is stored as `ABC1234`. This means `ABC-1234` and `ABC 1234` count as the same plate for uniqueness and for the duplicate check.
- **Plate uniqueness:** only among active vehicles. An inactive vehicle may keep a plate that an active vehicle now uses; reactivating it is rejected.
- **Offices:** unique by name *and* city ("Downtown / Austin" and "Downtown / Boston" can both exist).
- **Years and dates:** vehicle `year` is between 1886 and next year. Maintenance dates can't be in the future.
- **Maintenance types:** a fixed list (oil change, tire rotation, brakes, inspection, repair, other).

**Active flag**
- "Inactive" means out of service, possibly temporarily. It's not a deletion.
- Lists return inactive rows too; use `?is_active=` to filter.
- Maintenance can be recorded for inactive vehicles and by inactive mechanics, for example backfilling history.

**Deletes**
- Deleting really deletes; there is no soft delete.
- An office with vehicles, or a vehicle or mechanic with maintenance records, can't be deleted (`409`). Maintenance history is financial data, so it is never removed as a side effect. To take something out of service, set `is_active` to false.
- Maintenance records can be deleted freely, to correct mistakes.

**Reports**
- **Dates:** "today" and "current year" are evaluated in UTC, since offices span several US time zones.
- **Office summary:**
  - "Last 12 months" is a rolling window that includes the same date one year ago.
  - The vehicle count only counts active vehicles; cost and last maintenance include inactive ones, because that money was still spent by the office.
- **Vehicle search:**
  - `make` and `model` match case-insensitively.
  - When `maintenance_from`/`maintenance_to` and `mechanic_certification` are combined, they must all match **the same** maintenance record ("this mechanic serviced the vehicle in this period").
- **Vehicle assignment:** only the office changes; no assignment history is kept. Assigning to the current office succeeds and changes nothing.
- **Mechanic workload:**
  - Lists active mechanics plus any inactive mechanic who worked this year; inactive mechanics with no work this year are left out.
  - "Busiest" means most jobs, then highest cost, then name.
- **Needing maintenance:** "more than 365 days" is strict (exactly 365 days ago doesn't qualify). Never-serviced vehicles come first, then oldest service first, with ties broken by VIN.
- **Duplicate check:** VIN is compared against all vehicles, plate only against active ones. `exclude=<id>` lets an edit form ignore the vehicle being edited.

## Trade-offs

- **Rules enforced in the database:** every rule above that can be a database constraint is one (VIN format, plate format, partial unique plate index, cost ≥ 0, valid maintenance type, year range), so shells, admin actions and bulk scripts can't bypass them. Serializers repeat the checks only to produce readable 400s. The active-plate rule is therefore written twice, as a constraint and as a query, and shares one error message.
- **Money as JSON numbers:** amounts are serialized as numbers (`81250.5`), matching the brief's example, rather than DRF's default strings. Values stay `Decimal` in Python and the database; clients doing arithmetic on money should be aware they receive floats.
- **Vehicle details returns the complete history:** as the brief asks. It costs 2 queries regardless of history size; an 800-record vehicle returns in about 30 ms, but the payload is large (about 160 KB). Clients that want pages use `/vehicles/{id}/maintenance/`.
- **Business logic outside HTTP:** reports and writes live in plain functions (`fleet/selectors.py`, `fleet/services.py`) that take explicit arguments like `today`, so they are tested directly with fixed dates. CRUD stays on DRF's `ModelViewSet`, since wrapping simple creates in service functions would add code without adding behavior.
- **No `make`/`model` index:** case-insensitive search can't use a plain index on SQLite. At this scale a table scan is fast; for a much larger fleet, functional indexes on `Upper("make")`/`Upper("model")` would be the next step.
- **Page-number pagination:** each page runs a `COUNT(*)`. Fine at this size; cursor pagination would avoid it on very large tables.
- **Summary and workload aren't paginated:** they return one row per office or mechanic, which stays small, and the brief's example is a plain list.
- **No authentication:** the brief says it isn't required.
- **SQLite:** the project default. Every query uses the ORM and would run unchanged on PostgreSQL.

## Project layout

```
backend/
  fleet/
    models/          # Office, Vehicle, Mechanic, MaintenanceRecord and their constraints
    normalization.py # VIN / plate / certification cleanup
    selectors.py     # read queries: search, reports, conflict checks
    services.py      # writes with business rules (vehicle assignment)
    serializers.py   # request/response shapes and input validation
    views.py         # HTTP layer: validate params, call selectors/services
    seeding.py       # sample data generator used by `manage.py seed`
    tests/
  server/            # Django settings and URLs
frontend/            # Next.js app
```
