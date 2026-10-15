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
  { id: 'graphic-design', label: 'Graphic Design', points: 45, track: 'graphic-design' },
  { id: 'uiux', label: 'UI/UX Design', points: 65, track: 'ui-ux-design' },
  { id: 'ui-ux-design', label: 'UI/UX Design', points: 65, track: 'ui-ux-design' },
  { id: 'web', label: 'Web Development', points: 65, track: 'web-development' },
  { id: 'web-development', label: 'Web Development', points: 65, track: 'web-development' },
  { id: 'mobile-app-development', label: 'Mobile App Development', points: 65, track: 'mobile-app-development' },
  { id: 'motion-graphics', label: 'Motion Graphics', points: 50, track: 'motion-graphics' },
  { id: 'video-editing', label: 'Video Editing', points: 50, track: 'video-editing' },
  { id: 'social-media-management', label: 'Social Media Management', points: 40, track: 'social-media-management' },
  { id: 'general-it-solutions', label: 'General IT Solutions', points: 50, track: 'general-it-solutions' },
  { id: 'it-solutions', label: 'General IT Solutions', points: 50, track: 'general-it-solutions' },
] as const;

export const getServicePoints = (serviceTypeId: string): number => {
  const service = SERVICE_TYPES.find(s => s.id === serviceTypeId);
  return service?.points || 40;
};

export const getServiceLabel = (serviceTypeId: string): string => {
  const service = SERVICE_TYPES.find(s => s.id === serviceTypeId);
  return service?.label || serviceTypeId;
};
