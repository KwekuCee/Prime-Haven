import DepartmentAdminDashboard from '@/components/admin/DepartmentAdminDashboard';

const GraphicDesignAdminDashboard = () => (
  <DepartmentAdminDashboard
    config={{
      services: ['logo-design', 'brand-identity', 'print-design', 'flyer-design', 'social-media', 'logo', 'branding', 'print', 'flyer', 'packaging', 'graphic-design'],
      title: 'Graphic Design',
      subtitle: 'Review queue for logos, brand identity, print and flyer work',
      deptLabel: 'Graphic Dept',
      defaultPoints: 40,
      talentNoun: 'Designer',
    }}
  />
);

export default GraphicDesignAdminDashboard;
