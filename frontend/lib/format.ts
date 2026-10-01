const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const formatMoney = (value: number) => currency.format(value);

export const formatDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';

export const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;
