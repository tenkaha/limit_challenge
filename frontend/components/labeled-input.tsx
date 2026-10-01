'use client';

import { TextField } from '@mui/material';
import { fonts } from '@/app/theme';
import LabeledField from './labeled-field';

interface Props {
  id: string;
  label: string;
  value: string;
  error?: string;
  mono?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}

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
    <LabeledField htmlFor={id} label={label} required>
      <TextField
        id={id}
        value={value}
        required
        autoFocus={autoFocus}
        error={Boolean(error)}
        helperText={error}
        onChange={(event) => onChange(event.target.value)}
        slotProps={{ htmlInput: { style: mono ? { fontFamily: fonts.mono } : undefined } }}
      />
    </LabeledField>
  );
}
