'use client';

import {
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Link2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { fonts } from '@/app/theme';
import { useToast } from '@/components/toast';
import { formatDate } from '@/lib/format';
import type { Office, VehicleFilters } from '@/lib/types';
import type { FilterKey } from './use-vehicle-filters';

interface Props {
  filters: VehicleFilters;
  offices: Office[];
  onChange: (changes: Partial<VehicleFilters>) => void;
  onClear: () => void;
}

const DEBOUNCE_MS = 350;

// Typing updates local state immediately and pushes to the URL after a pause.
// The timer lives in the change handler, so there is no effect to clean up.
function DebouncedField({
  label,
  value,
  mono = false,
  placeholder,
  onCommit,
}: {
  label: string;
  value: string;
  mono?: boolean;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The URL changed from outside (chip removed, Clear all): adopt it during render.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  return (
    <TextField
      label={label}
      size="small"
      value={draft}
      placeholder={placeholder}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { style: mono ? { fontFamily: fonts.mono } : undefined },
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onCommit(next.trim()), DEBOUNCE_MS);
      }}
    />
  );
}

function describeRange(from?: string, to?: string) {
  if (from && to) return `Serviced ${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `Serviced from ${formatDate(from)}`;
  return `Serviced until ${formatDate(to ?? null)}`;
}

export default function VehicleFiltersBar({ filters, offices, onChange, onClear }: Props) {
  const toast = useToast();
  const officeName = offices.find((office) => String(office.id) === filters.office)?.name;
  const dateError =
    filters.maintenance_from &&
    filters.maintenance_to &&
    filters.maintenance_from > filters.maintenance_to
      ? 'Must be on or before "Serviced to"'
      : undefined;

  const chips: { label: string; keys: FilterKey[] }[] = [];
  if (filters.office) chips.push({ label: `Office: ${officeName ?? '…'}`, keys: ['office'] });
  if (filters.is_active)
    chips.push({
      label: filters.is_active === 'true' ? 'Active only' : 'Inactive only',
      keys: ['is_active'],
    });
  if (filters.make) chips.push({ label: `Make: ${filters.make}`, keys: ['make'] });
  if (filters.model) chips.push({ label: `Model: ${filters.model}`, keys: ['model'] });
  if (filters.maintenance_from || filters.maintenance_to)
    chips.push({
      label: describeRange(filters.maintenance_from, filters.maintenance_to),
      keys: ['maintenance_from', 'maintenance_to'],
    });
  if (filters.mechanic_certification)
    chips.push({
      label: `Serviced by ${filters.mechanic_certification}`,
      keys: ['mechanic_certification'],
    });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied', 'Anyone with the link sees this search.');
    } catch {
      toast.error("Couldn't copy the link", 'Copy it from the address bar instead.');
    }
  };

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="Filters"
      sx={{ p: 2, mb: 2.5, display: 'flex', flexDirection: 'column', gap: 1.75 }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}
      >
        <TextField
          select
          label="Office"
          size="small"
          value={filters.office ?? ''}
          slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
          onChange={(event) => onChange({ office: event.target.value })}
        >
          <MenuItem value="">All offices</MenuItem>
          {offices.map((office) => (
            <MenuItem key={office.id} value={String(office.id)}>
              {office.name} · {office.city}
            </MenuItem>
          ))}
        </TextField>
        <DebouncedField
          label="Make"
          value={filters.make ?? ''}
          placeholder="Any make"
          onCommit={(make) => onChange({ make })}
        />
        <DebouncedField
          label="Model"
          value={filters.model ?? ''}
          placeholder="Any model"
          onCommit={(model) => onChange({ model })}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          aria-label="Status"
          value={filters.is_active ?? ''}
          onChange={(_event, value: string | null) => {
            if (value !== null) onChange({ is_active: value });
          }}
          sx={{ '& .MuiToggleButton-root': { flexGrow: 1, textTransform: 'none', height: 40 } }}
        >
          <ToggleButton value="">All</ToggleButton>
          <ToggleButton value="true">Active</ToggleButton>
          <ToggleButton value="false">Inactive</ToggleButton>
        </ToggleButtonGroup>
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
        <Box sx={{ gridColumn: { md: 'span 2' }, display: 'grid' }}>
          <DebouncedField
            label="Serviced by (certification)"
            value={filters.mechanic_certification ?? ''}
            placeholder="e.g. ASE-000009"
            mono
            onCommit={(mechanic_certification) => onChange({ mechanic_certification })}
          />
        </Box>
      </Box>
      {chips.length ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            pt: 1.5,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography fontSize={12} color="text.secondary" mr={0.5}>
            Active filters
          </Typography>
          {chips.map((chip) => (
            <Chip
              key={chip.label}
              label={chip.label}
              size="small"
              color="primary"
              variant="outlined"
              onDelete={() => onChange(Object.fromEntries(chip.keys.map((key) => [key, ''])))}
            />
          ))}
          <Button size="small" onClick={onClear} sx={{ minHeight: 30 }}>
            Clear all
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<Link2 size={15} />}
            onClick={copyLink}
            sx={{ ml: 'auto', minHeight: 32, borderColor: 'divider' }}
          >
            Copy link
          </Button>
        </Box>
      ) : null}
    </Paper>
  );
}
