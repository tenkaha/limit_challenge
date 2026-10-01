import { Suspense } from 'react';
import { CircularProgress } from '@mui/material';
import VehiclesView from './vehicles-view';

// useSearchParams() needs a Suspense boundary so the page shell can be prerendered.
export default function VehiclesPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <VehiclesView />
    </Suspense>
  );
}
