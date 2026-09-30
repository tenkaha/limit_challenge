// Mirrors the API's plate normalization so the form can preview the stored value.
export const normalizePlate = (plate: string) => plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
