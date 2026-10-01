import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { colors } from '@/app/theme';

interface Props {
  htmlFor: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}

// The design's form field: label above the control (TextField, select, date…),
// with the control's own helper/error text underneath. A select isn't labelled by
// htmlFor: give it the label's id via `slotProps.select.labelId` ("<htmlFor>-label").
export default function LabeledField({ htmlFor, label, required, children }: Props) {
  return (
    <Stack spacing={0.75}>
      <Typography
        component="label"
        id={`${htmlFor}-label`}
        htmlFor={htmlFor}
        fontSize={13}
        fontWeight={500}
        color={colors.inkSoft}
      >
        {label}
        {required ? (
          <Typography component="span" color="error.main" aria-hidden>
            {' *'}
          </Typography>
        ) : null}
      </Typography>
      {children}
    </Stack>
  );
}
