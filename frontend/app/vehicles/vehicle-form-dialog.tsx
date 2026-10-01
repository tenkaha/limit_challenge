'use client';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fonts } from '@/app/theme';
import LabeledField from '@/components/labeled-field';
import { api } from '@/lib/api';
import { invalidate } from '@/lib/queries';
import { fieldErrors, generalError } from '@/lib/errors';
import { normalizePlate } from '@/lib/normalize';
import type { Office, Vehicle, VehicleInput } from '@/lib/types';

interface Props {
  vehicle: Vehicle | null;
  offices: Office[];
  onClose: () => void;
  onSaved: (saved: Vehicle, created: boolean) => void;
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

const monoInput = { htmlInput: { style: { fontFamily: fonts.mono } } };

export default function VehicleFormDialog({ vehicle, offices, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VehicleInput>(() =>
    vehicle ? { ...vehicle } : { ...EMPTY, office: offices[0]?.id ?? 0 },
  );
  const save = useMutation({
    mutationFn: (input: VehicleInput) =>
      vehicle ? api.vehicles.update(vehicle.id, input) : api.vehicles.create(input),
    onSuccess: async (saved) => {
      await invalidate.vehicles(queryClient);
      onSaved(saved, vehicle === null);
    },
  });
  const errors = fieldErrors(save.error);
  const formError = generalError(save.error);
  const plate = normalizePlate(form.license_plate);
  const set = (changes: Partial<VehicleInput>) => setForm({ ...form, ...changes });

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(form);
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {vehicle ? 'Edit vehicle' : 'New vehicle'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <LabeledField htmlFor="vehicle-vin" label="VIN" required>
              <TextField
                id="vehicle-vin"
                required
                value={form.vin}
                error={Boolean(errors.vin)}
                helperText={errors.vin ?? '17 characters, no I, O or Q'}
                slotProps={monoInput}
                onChange={(event) => set({ vin: event.target.value })}
              />
            </LabeledField>
            <LabeledField htmlFor="vehicle-plate" label="License plate" required>
              <TextField
                id="vehicle-plate"
                required
                value={form.license_plate}
                error={Boolean(errors.license_plate)}
                helperText={
                  errors.license_plate ??
                  (plate ? (
                    <>
                      Saved as{' '}
                      <Box component="span" sx={{ fontFamily: fonts.mono, color: 'text.primary' }}>
                        {plate}
                      </Box>{' '}
                      · spaces and dashes are removed
                    </>
                  ) : (
                    'Spaces and dashes are removed'
                  ))
                }
                slotProps={monoInput}
                onChange={(event) => set({ license_plate: event.target.value })}
              />
            </LabeledField>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <LabeledField htmlFor="vehicle-make" label="Make" required>
                <TextField
                  id="vehicle-make"
                  required
                  value={form.make}
                  error={Boolean(errors.make)}
                  helperText={errors.make}
                  onChange={(event) => set({ make: event.target.value })}
                />
              </LabeledField>
              <LabeledField htmlFor="vehicle-model" label="Model" required>
                <TextField
                  id="vehicle-model"
                  required
                  value={form.model}
                  error={Boolean(errors.model)}
                  helperText={errors.model}
                  onChange={(event) => set({ model: event.target.value })}
                />
              </LabeledField>
              <LabeledField htmlFor="vehicle-year" label="Year" required>
                <TextField
                  id="vehicle-year"
                  type="number"
                  required
                  value={form.year}
                  error={Boolean(errors.year)}
                  helperText={errors.year}
                  onChange={(event) => set({ year: Number(event.target.value) })}
                />
              </LabeledField>
              <LabeledField htmlFor="vehicle-office" label="Office" required>
                <TextField
                  id="vehicle-office"
                  slotProps={{ select: { labelId: 'vehicle-office-label' } }}
                  select
                  required
                  value={form.office || ''}
                  error={Boolean(errors.office)}
                  helperText={errors.office}
                  onChange={(event) => set({ office: Number(event.target.value) })}
                >
                  {offices.map((office) => (
                    <MenuItem key={office.id} value={office.id}>
                      {office.name} · {office.city}
                    </MenuItem>
                  ))}
                </TextField>
              </LabeledField>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.is_active}
                  onChange={(event) => set({ is_active: event.target.checked })}
                />
              }
              label="In service (active)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            sx={{ borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={save.isPending}>
            Save vehicle
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
