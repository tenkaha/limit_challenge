'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { errorMessage, fieldErrors } from '@/lib/errors';
import type { Office, Vehicle, VehicleInput } from '@/lib/types';

interface Props {
  vehicle: Vehicle | null;
  offices: Office[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

const EMPTY: VehicleInput = {
  vin: '',
  license_plate: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  office: 0,
  is_active: true,
};

export default function VehicleFormDialog({ vehicle, offices, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VehicleInput>(() =>
    vehicle ? { ...vehicle } : { ...EMPTY, office: offices[0]?.id ?? 0 },
  );
  const save = useMutation({
    mutationFn: (input: VehicleInput) =>
      vehicle ? api.vehicles.update(vehicle.id, input) : api.vehicles.create(input),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicle', saved.id] });
      onSaved(vehicle ? 'Vehicle updated' : 'Vehicle created');
    },
  });
  const errors = fieldErrors(save.error);
  const generalError = save.error && Object.keys(errors).length === 0;

  const text = (key: 'vin' | 'license_plate' | 'make' | 'model', label: string, help?: string) => (
    <TextField
      label={label}
      value={form[key]}
      required
      error={Boolean(errors[key])}
      helperText={errors[key] ?? help}
      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
    />
  );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(form);
        }}
      >
        <DialogTitle>{vehicle ? 'Edit vehicle' : 'New vehicle'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {generalError ? <Alert severity="error">{errorMessage(save.error)}</Alert> : null}
            {text('vin', 'VIN', '17 characters, no I, O or Q')}
            {text('license_plate', 'License plate', 'Spaces and dashes are removed')}
            <Stack direction="row" spacing={2}>
              {text('make', 'Make')}
              {text('model', 'Model')}
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Year"
                type="number"
                required
                value={form.year}
                error={Boolean(errors.year)}
                helperText={errors.year}
                onChange={(event) => setForm({ ...form, year: Number(event.target.value) })}
              />
              <TextField
                select
                label="Office"
                required
                fullWidth
                value={form.office || ''}
                error={Boolean(errors.office)}
                helperText={errors.office}
                onChange={(event) => setForm({ ...form, office: Number(event.target.value) })}
              >
                {offices.map((office) => (
                  <MenuItem key={office.id} value={office.id}>
                    {office.name} · {office.city}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                />
              }
              label="Active (in service)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" loading={save.isPending}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
