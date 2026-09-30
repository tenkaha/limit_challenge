'use client';

import { Box, IconButton, Snackbar, Typography } from '@mui/material';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { colors } from '@/app/theme';

interface ToastMessage {
  id: number;
  kind: 'success' | 'error';
  title: string;
  detail?: string;
}

interface ToastApi {
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

// One toast at a time, bottom-left: a newer message replaces the current one.
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const show = useCallback(
    (kind: ToastMessage['kind']) => (title: string, detail?: string) =>
      setToast({ id: Date.now(), kind, title, detail }),
    [],
  );
  const api = useMemo(() => ({ success: show('success'), error: show('error') }), [show]);
  const close = () => setToast(null);
  const Icon = toast?.kind === 'error' ? CircleAlert : CircleCheck;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Snackbar
        key={toast?.id}
        open={toast !== null}
        onClose={(_event, reason) => reason !== 'clickaway' && close()}
        autoHideDuration={toast?.kind === 'error' ? 8000 : 3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box
          role={toast?.kind === 'error' ? 'alert' : 'status'}
          sx={{
            width: 420,
            maxWidth: 'calc(100vw - 32px)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            bgcolor: colors.toast,
            color: '#fff',
            borderRadius: 3,
            py: 1.75,
            pl: 2,
            pr: 1.5,
            boxShadow: '0 12px 24px rgba(16, 24, 40, 0.24)',
          }}
        >
          <Icon
            size={20}
            color={toast?.kind === 'error' ? '#FDA29B' : '#6CE9A6'}
            style={{ flexShrink: 0, marginTop: 1 }}
            aria-hidden
          />
          <Box flexGrow={1}>
            <Typography fontSize={14} fontWeight={600}>
              {toast?.title}
            </Typography>
            {toast?.detail ? (
              <Typography fontSize={14} color="#D0D5DD">
                {toast.detail}
              </Typography>
            ) : null}
          </Box>
          <IconButton aria-label="Dismiss" size="small" onClick={close} sx={{ color: '#D0D5DD' }}>
            <X size={16} />
          </IconButton>
        </Box>
      </Snackbar>
    </ToastContext.Provider>
  );
}
