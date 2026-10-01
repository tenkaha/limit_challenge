'use client';

import { Box, Button, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { invalidate, queries } from '@/lib/queries';
import { errorMessage } from '@/lib/errors';
import type { Id, Office } from '@/lib/types';

interface AssignOfficeProps {
  vehicleId: Id;
  office: Office;
}

// Keyed by office id in the parent, so the select resets after a move.
export default function AssignOffice({ vehicleId, office }: AssignOfficeProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const offices = useQuery(queries.officeList());
  const [target, setTarget] = useState(String(office.id));

  const assign = useMutation({
    mutationFn: () => api.vehicles.assign(vehicleId, Number(target)),
    onSuccess: async () => {
      const moved = offices.data?.results.find((option) => String(option.id) === target);
      toast.success('Vehicle moved', moved ? `Now at ${moved.name}` : undefined);
      await invalidate.vehicles(queryClient);
    },
    onError: (error) => toast.error("Couldn't move vehicle", errorMessage(error)),
  });

  return (
    <Paper
      variant="outlined"
      sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}
    >
      <Typography fontSize={12} color="text.secondary">
        Office
      </Typography>
      <Box>
        <Typography fontSize={16} fontWeight={500}>
          {office.name}
        </Typography>
        <Typography fontSize={14} color="text.secondary">
          {office.city}
        </Typography>
      </Box>
      <Box mt="auto" display="flex" flexDirection="column" gap={1.5}>
        <TextField
          select
          size="small"
          label="Move to"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          disabled={offices.isPending}
          fullWidth
        >
          {(offices.data?.results ?? [office]).map((option) => (
            <MenuItem key={option.id} value={String(option.id)}>
              {option.name} · {option.city}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => assign.mutate()}
          loading={assign.isPending}
          disabled={target === String(office.id)}
          sx={{ borderColor: 'divider' }}
        >
          Move vehicle
        </Button>
      </Box>
    </Paper>
  );
}
