'use client';

import { Button, MenuItem, Paper, Stack, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import type { Office, VehicleFilters } from '@/lib/types';

interface Props {
  filters: VehicleFilters;
  offices: Office[];
  activeCount: number;
  onChange: (changes: Partial<VehicleFilters>) => void;
  onClear: () => void;
}

const DEBOUNCE_MS = 350;

// Text inputs keep local state and push to the URL after a pause, so typing
// doesn't fire a request per keystroke.
function DebouncedField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // Resync when the URL changes from outside (e.g. "Clear filters"), during render
  // rather than in an effect: https://react.dev/learn/you-might-not-need-an-effect
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onCommit(draft.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value, onCommit]);
  return (
    <TextField
      label={label}
      size="small"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

export default function VehicleFiltersBar({
  filters,
  offices,
  activeCount,
  onChange,
  onClear,
}: Props) {
  const dateError =
    filters.maintenance_from &&
    filters.maintenance_to &&
    filters.maintenance_from > filters.maintenance_to
      ? 'Must be on or before "Serviced to"'
      : undefined;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Stack direction="row" flexWrap="wrap" gap={2} alignItems="flex-start">
        <TextField
          select
          label="Office"
          size="small"
          sx={{ minWidth: 200 }}
          value={filters.office ?? ''}
          onChange={(event) => onChange({ office: event.target.value })}
        >
          <MenuItem value="">All offices</MenuItem>
          {offices.map((office) => (
            <MenuItem key={office.id} value={String(office.id)}>
              {office.name} · {office.city}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          size="small"
          sx={{ minWidth: 140 }}
          value={filters.is_active ?? ''}
          onChange={(event) => onChange({ is_active: event.target.value })}
        >
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </TextField>
        <DebouncedField
          label="Make"
          value={filters.make ?? ''}
          onCommit={(make) => onChange({ make })}
        />
        <DebouncedField
          label="Model"
          value={filters.model ?? ''}
          onCommit={(model) => onChange({ model })}
        />
        <TextField
          label="Serviced from"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.maintenance_from ?? ''}
          error={Boolean(dateError)}
          helperText={dateError}
          onChange={(event) => onChange({ maintenance_from: event.target.value })}
        />
        <TextField
          label="Serviced to"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.maintenance_to ?? ''}
          onChange={(event) => onChange({ maintenance_to: event.target.value })}
        />
        <DebouncedField
          label="Mechanic certification"
          value={filters.mechanic_certification ?? ''}
          onCommit={(mechanic_certification) => onChange({ mechanic_certification })}
        />
        <Button onClick={onClear} disabled={activeCount === 0} sx={{ alignSelf: 'center' }}>
          Clear filters{activeCount ? ` (${activeCount})` : ''}
        </Button>
      </Stack>
    </Paper>
  );
}
