import { Box } from '@mui/material';
import { colors } from '@/app/theme';

export default function StatusDot({ active }: { active: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        fontSize: 13,
        color: active ? 'success.dark' : 'text.secondary',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: active ? 'success.main' : colors.dotInactive,
        }}
      />
      {active ? 'Active' : 'Inactive'}
    </Box>
  );
}
