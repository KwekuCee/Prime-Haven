import DepartmentAdminDashboard from '@/components/admin/DepartmentAdminDashboard';

const UIUXAdminDashboard = () => (
  <DepartmentAdminDashboard
    config={{
      services: ['app-design', 'uiux-design', 'wireframing', 'prototyping', 'web-design', 'dashboard-design', 'uiux', 'ui-ux'],
      title: 'UI/UX Design',
      subtitle: 'Review queue for UI/UX, wireframing, prototyping and interface work',
      deptLabel: 'UI/UX Dept',
      defaultPoints: 65,
      talentNoun: 'Designer',
    }}
  />
);

export default UIUXAdminDashboard;
