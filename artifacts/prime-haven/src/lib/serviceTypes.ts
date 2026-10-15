export interface ServiceTypeDefinition {
  id: string;
  label: string;
  points: number;
  track?: string;
}

export const SERVICE_TYPES = [
  { id: 'logo', label: 'Logo Design', points: 45, track: 'graphic-design' },
  { id: 'branding', label: 'Brand Identity', points: 50, track: 'graphic-design' },
  { id: 'flyer', label: 'Flyer Design', points: 40, track: 'graphic-design' },
  { id: 'print', label: 'Print Design', points: 20, track: 'graphic-design' },
  { id: 'uiux', label: 'UI/UX Design', points: 65, track: 'ui-ux-design' },
  { id: 'web', label: 'Web Development', points: 65, track: 'web-development' },
  { id: 'mobile-app', label: 'Mobile App Development', points: 65, track: 'ui-ux-design' },
  { id: 'motion-graphics', label: 'Motion Graphics', points: 50, track: 'motion-graphics' },
  { id: 'video-editing', label: 'Video Editing', points: 50, track: 'video-editing' },
  { id: 'social-media', label: 'Social Media Management', points: 40, track: 'social-media-management' },
  { id: 'general-it', label: 'General IT Solutions', points: 50, track: 'general-it-solutions' },
] as const;

export const getServicePoints = (serviceTypeId: string): number => {
  const idLower = (serviceTypeId || '').toLowerCase().trim();
  const service = SERVICE_TYPES.find(s => s.id === idLower || s.track === idLower);
  return service?.points || 40;
};

export const getServiceLabel = (serviceTypeId: string): string => {
  const idLower = (serviceTypeId || '').toLowerCase().trim();
  const service = SERVICE_TYPES.find(s => s.id === idLower || s.track === idLower);
  return service?.label || serviceTypeId;
};
