'use client';

import { Checkbox, FormControlLabel } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import LabeledInput from '@/components/labeled-input';
import FormDialog from '@/components/form-dialog';
import { api } from '@/lib/api';
import { invalidate } from '@/lib/queries';
import { fieldErrors } from '@/lib/errors';
import type { Mechanic, MechanicInput } from '@/lib/types';

export default function MechanicDialog({
  mechanic,
  onClose,
  onSaved,
}: {
  mechanic: Mechanic | null;
  onClose: () => void;
  onSaved: (title: string, detail: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MechanicInput>({
    name: mechanic?.name ?? '',
    certification_number: mechanic?.certification_number ?? '',
    is_active: mechanic?.is_active ?? true,
  });
  const save = useMutation({
    mutationFn: (input: MechanicInput) =>
      mechanic ? api.mechanics.update(mechanic.id, input) : api.mechanics.create(input),
    onSuccess: async (saved) => {
      await invalidate.mechanics(queryClient);
      onSaved(mechanic ? 'Mechanic updated' : 'Mechanic created', saved.name);
    },
  });
  const errors = fieldErrors(save.error);

  return (
    <FormDialog
      title={mechanic ? 'Edit mechanic' : 'New mechanic'}
      submitLabel="Save mechanic"
      size="xs"
      error={save.error}
      isPending={save.isPending}
      onSubmit={() => {
        save.mutate(form);
      }}
      onClose={onClose}
    >
      <LabeledInput
        id="mechanic-name"
        label="Name"
        value={form.name}
        error={errors.name}
        autoFocus
        onChange={(name) => setForm({ ...form, name })}
      />
      <LabeledInput
        id="mechanic-certification"
        label="Certification number"
        value={form.certification_number}
        error={errors.certification_number}
        mono
        onChange={(certification_number) => setForm({ ...form, certification_number })}
      />
      <FormControlLabel
        sx={{ minHeight: 44 }}
        control={
          <Checkbox
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
          />
        }
        label="Active (currently working)"
      />
    </FormDialog>
  );
}
