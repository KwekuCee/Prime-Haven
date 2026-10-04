import DepartmentAdminDashboard from '@/components/admin/DepartmentAdminDashboard';

const WebDevAdminDashboard = () => (
  <DepartmentAdminDashboard
    config={{
      services: ['web-development', 'backend', 'fullstack', 'ecommerce-dev', 'web', 'ecommerce'],
      title: 'Web Development',
      subtitle: 'Review queue for websites, web apps and e-commerce builds',
      deptLabel: 'Web Dept',
      defaultPoints: 80,
      talentNoun: 'Developer',
    }}
  />
);

export default WebDevAdminDashboard;
