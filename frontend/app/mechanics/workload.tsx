'use client';

import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { colors, fonts } from '@/app/theme';
import QueryState from '@/components/query-state';
import { queries } from '@/lib/queries';
import { formatMoney } from '@/lib/format';
import type { Mechanic } from '@/lib/types';
import { tabular } from '@/lib/sx';

export default function Workload({ mechanics }: { mechanics: Mechanic[] }) {
  const workload = useQuery(queries.mechanicWorkload());
  const rows = workload.data ?? [];
  const inactive = useMemo(
    () => new Set(mechanics.filter((m) => !m.is_active).map((m) => m.id)),
    [mechanics],
  );
  const busiest = Math.max(1, ...rows.map((row) => row.jobs_this_year));

  return (
    <QueryState
      isPending={workload.isPending}
      error={workload.error}
      onRetry={() => void workload.refetch()}
      isEmpty={rows.length === 0}
      emptyMessage="No mechanics to rank yet."
    >
      <TableContainer component={Paper} variant="outlined" sx={{ position: 'relative' }}>
        <Table aria-label="Mechanic workload">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 48 }}>#</TableCell>
              <TableCell>Mechanic</TableCell>
              <TableCell sx={{ width: '40%' }}>Jobs this year</TableCell>
              <TableCell align="right">Cost this year</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ ...tabular, color: 'text.secondary' }}>{index + 1}</TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontSize={14} fontWeight={500}>
                      {row.name}
                    </Typography>
                    {inactive.has(row.id) ? <InactivePill /> : null}
                  </Stack>
                  <Typography fontSize={12} color={colors.subtle} fontFamily={fonts.mono}>
                    {row.certification_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      role="img"
                      aria-label={`${row.jobs_this_year} jobs`}
                      sx={{
                        flexGrow: 1,
                        height: 8,
                        borderRadius: 99,
                        bgcolor: colors.rowDivider,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 99,
                          bgcolor: 'primary.main',
                          width: `${row.jobs_this_year ? Math.max(2, (row.jobs_this_year / busiest) * 100) : 0}%`,
                        }}
                      />
                    </Box>
                    <Box component="span" sx={{ ...tabular, width: 36, textAlign: 'right' }}>
                      {row.jobs_this_year}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell align="right" sx={tabular}>
                  {formatMoney(row.cost_this_year)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography fontSize={13} color={colors.subtle} mt={2}>
        Busiest first: most jobs, then highest cost. Inactive mechanics appear only if they worked
        this year.
      </Typography>
    </QueryState>
  );
}

function InactivePill() {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 12,
        color: 'text.secondary',
        bgcolor: colors.rowDivider,
        borderRadius: 99,
        px: 1,
        py: 0.25,
      }}
    >
      Inactive
    </Box>
  );
}
