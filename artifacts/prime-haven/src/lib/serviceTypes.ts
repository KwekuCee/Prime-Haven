export const SERVICE_TYPES = [
  { id: 'logo', label: 'Logo Design', points: 45 },
  { id: 'branding', label: 'Brand Identity', points: 50 },
  { id: 'uiux', label: 'UI/UX Design', points: 65 },
  { id: 'web', label: 'Web Design', points: 65 },
  { id: 'print', label: 'Print Design', points: 20 },
  { id: 'flyer', label: 'Flyer Design', points: 40 },
] as const;

export const getServicePoints = (serviceTypeId: string): number => {
  const service = SERVICE_TYPES.find(s => s.id === serviceTypeId);
  return service?.points || 40;
};

export const getServiceLabel = (serviceTypeId: string): string => {
  const service = SERVICE_TYPES.find(s => s.id === serviceTypeId);
  return service?.label || serviceTypeId;
};
