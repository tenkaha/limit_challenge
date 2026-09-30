'use client';

import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import type { Id, Office } from '@/lib/types';

interface AssignOfficeProps {
  vehicleId: Id;
  office: Office;
  onMoved: () => void;
}

// The parent remounts this on office change (key), so success feedback lives in the parent.
export default function AssignOffice({ vehicleId, office, onMoved }: AssignOfficeProps) {
  const queryClient = useQueryClient();
  const offices = useQuery({ queryKey: ['offices'], queryFn: api.offices.list });
  const [target, setTarget] = useState(String(office.id));

  const assign = useMutation({
    mutationFn: () => api.vehicles.assign(vehicleId, Number(target)),
    onSuccess: async () => {
      onMoved();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
      ]);
    },
  });

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <TextField
          select
          size="small"
          label="Office"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          disabled={offices.isPending}
          sx={{ minWidth: 260 }}
        >
          {(offices.data?.results ?? [office]).map((option) => (
            <MenuItem key={option.id} value={String(option.id)}>
              {option.name} · {option.city}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          onClick={() => assign.mutate()}
          loading={assign.isPending}
          disabled={target === String(office.id)}
        >
          Move to office
        </Button>
      </Stack>
      {assign.error ? <Alert severity="error">{errorMessage(assign.error)}</Alert> : null}
    </Stack>
  );
}
