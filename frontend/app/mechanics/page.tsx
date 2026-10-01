'use client';

import { Box, Button, Tab, Tabs } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '@/components/page-header';
import { useToast } from '@/components/toast';
import { queries } from '@/lib/queries';
import type { Mechanic } from '@/lib/types';
import MechanicDialog from './mechanic-dialog';
import MechanicList from './mechanic-list';
import Workload from './workload';

export default function MechanicsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'workload' | 'list'>('workload');
  const [editing, setEditing] = useState<Mechanic | 'new' | null>(null);
  const list = useQuery(queries.mechanicList());
  const year = new Date().getFullYear();

  return (
    <>
      <PageHeader
        title="Mechanics"
        action={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setEditing('new')}
            sx={{ minHeight: 44 }}
          >
            New mechanic
          </Button>
        }
      />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs
          value={tab}
          onChange={(_event, value: 'workload' | 'list') => setTab(value)}
          aria-label="Mechanics views"
        >
          <Tab value="workload" label={`Workload ${year}`} />
          <Tab
            value="list"
            label={list.data ? `All mechanics (${list.data.count})` : 'All mechanics'}
          />
        </Tabs>
      </Box>

      {tab === 'workload' ? (
        <Workload mechanics={list.data?.results ?? []} />
      ) : (
        <MechanicList
          list={list}
          onEdit={setEditing}
          onDeleted={(name) => toast.success('Mechanic deleted', name)}
          onBlocked={(name, message) => toast.error(`Can't delete ${name}`, message)}
        />
      )}

      {editing !== null ? (
        <MechanicDialog
          mechanic={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(title, detail) => {
            setEditing(null);
            toast.success(title, detail);
          }}
        />
      ) : null}
    </>
  );
}
