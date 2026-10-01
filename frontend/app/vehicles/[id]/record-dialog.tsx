'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import LabeledField from '@/components/labeled-field';
import { useState, type FormEvent } from 'react';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { queries } from '@/lib/queries';
import { errorMessage, fieldErrors, type FieldErrors } from '@/lib/errors';
import {
  MAINTENANCE_TYPES,
  type Id,
  type MaintenanceHistoryItem,
  type MaintenanceRecordInput,
  type MaintenanceType,
} from '@/lib/types';

interface RecordDialogProps {
  vehicleId: Id;
  record: MaintenanceHistoryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

// en-CA formats as YYYY-MM-DD, the value format of <input type="date">.
const today = () => new Date().toLocaleDateString('en-CA');

export default function RecordDialog({ vehicleId, record, onClose, onSaved }: RecordDialogProps) {
  const mechanics = useQuery(queries.mechanicList());
  const [form, setForm] = useState({
    mechanic: record ? String(record.mechanic.id) : '',
    performed_on: record?.performed_on ?? today(),
    maintenance_type: record?.maintenance_type ?? ('oil_change' as MaintenanceType),
    cost: record ? String(record.cost) : '',
    notes: record?.notes ?? '',
  });

  const toast = useToast();
  const save = useMutation({
    mutationFn: (input: MaintenanceRecordInput) =>
      record ? api.records.update(record.id, input) : api.records.create(input),
    onSuccess: () => {
      toast.success(record ? 'Record updated' : 'Record added');
      onSaved();
    },
  });

  const [missingMechanic, setMissingMechanic] = useState(false);
  const errors: FieldErrors = {
    ...fieldErrors(save.error),
    ...(missingMechanic ? { mechanic: 'Select a mechanic.' } : {}),
  };
  const hasFieldErrors = Object.keys(errors).some((key) => key !== 'non_field_errors');
  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMissingMechanic(!form.mechanic);
    if (!form.mechanic) return;
    save.mutate({
      vehicle: vehicleId,
      mechanic: Number(form.mechanic),
      performed_on: form.performed_on,
      maintenance_type: form.maintenance_type,
      cost: form.cost,
      notes: form.notes,
    });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600, pb: 1 }}>
          {record ? 'Edit maintenance record' : 'Add maintenance record'}
        </DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            mt={1}
            sx={{ '& .MuiInputBase-root:not(.MuiInputBase-multiline)': { minHeight: 44 } }}
          >
            {save.error && !hasFieldErrors ? (
              <Alert severity="error">{errorMessage(save.error)}</Alert>
            ) : null}
            <LabeledField htmlFor="record-mechanic" label="Mechanic" required>
              <TextField
                id="record-mechanic"
                slotProps={{ select: { labelId: 'record-mechanic-label' } }}
                select
                value={form.mechanic}
                onChange={set('mechanic')}
                error={Boolean(errors.mechanic)}
                helperText={
                  errors.mechanic ?? (mechanics.error ? errorMessage(mechanics.error) : '')
                }
                disabled={mechanics.isPending}
                required
              >
                {(mechanics.data?.results ?? []).map((mechanic) => (
                  <MenuItem key={mechanic.id} value={String(mechanic.id)}>
                    {mechanic.name} · {mechanic.certification_number}
                    {mechanic.is_active ? '' : ' (inactive)'}
                  </MenuItem>
                ))}
              </TextField>
            </LabeledField>
            <LabeledField htmlFor="record-date" label="Date" required>
              <TextField
                id="record-date"
                type="date"
                value={form.performed_on}
                onChange={set('performed_on')}
                error={Boolean(errors.performed_on)}
                helperText={errors.performed_on}
                slotProps={{ htmlInput: { max: today() } }}
                required
              />
            </LabeledField>
            <LabeledField htmlFor="record-type" label="Type" required>
              <TextField
                id="record-type"
                slotProps={{ select: { labelId: 'record-type-label' } }}
                select
                value={form.maintenance_type}
                onChange={set('maintenance_type')}
                error={Boolean(errors.maintenance_type)}
                helperText={errors.maintenance_type}
                required
              >
                {Object.entries(MAINTENANCE_TYPES).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            </LabeledField>
            <LabeledField htmlFor="record-cost" label="Cost (USD)" required>
              <TextField
                id="record-cost"
                value={form.cost}
                onChange={set('cost')}
                error={Boolean(errors.cost)}
                helperText={errors.cost}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                required
              />
            </LabeledField>
            <LabeledField htmlFor="record-notes" label="Notes">
              <TextField
                id="record-notes"
                value={form.notes}
                onChange={set('notes')}
                error={Boolean(errors.notes)}
                helperText={errors.notes}
                multiline
                minRows={2}
              />
            </LabeledField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            sx={{ borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={save.isPending}>
            {record ? 'Save record' : 'Add record'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
