'use client';

import { FormHelperText, OutlinedInput, Stack, Typography } from '@mui/material';
import { fonts } from '@/app/theme';

interface Props {
  id: string;
  label: string;
  value: string;
  error?: string;
  mono?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}

// Label above a 44px input, error text below it: the dialog field style.
export default function LabeledInput({
  id,
  label,
  value,
  error,
  mono,
  autoFocus,
  onChange,
}: Props) {
  return (
    <Stack spacing={0.75}>
      <Typography component="label" htmlFor={id} fontSize={13} fontWeight={500} color="#344054">
        {label}
      </Typography>
      <OutlinedInput
        id={id}
        value={value}
        required
        autoFocus={autoFocus}
        error={Boolean(error)}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        sx={{ height: 44, fontFamily: mono ? fonts.mono : undefined }}
      />
      {error ? <FormHelperText error>{error}</FormHelperText> : null}
    </Stack>
  );
}
