import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  Wallet, 
  Settings, 
  LogOut, 
  TrendingUp,
  Award,
  Clock,
  FileCheck,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const stats = [
  { label: 'Total Points', value: '1,250', icon: Award, trend: '+120 this month' },
  { label: 'Monthly Rank', value: '#12', icon: TrendingUp, trend: 'of 47 designers' },
  { label: 'Est. Salary', value: '$485', icon: Wallet, trend: 'Based on current points' },
  { label: 'Submissions', value: '23', icon: FileCheck, trend: '18 approved' },
];

const recentActivity = [
  { type: 'approved', project: 'TechFlow Dashboard', points: 15, time: '2 hours ago' },
  { type: 'preference', project: 'Artisan Logo', points: 40, time: '1 day ago' },
  { type: 'submitted', project: 'Nova Campaign', points: 0, time: '2 days ago' },
  { type: 'revision', project: 'CloudSync UI', points: 5, time: '3 days ago' },
];

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
        bg-card border-r border-border transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border flex items-center justify-between">
            <Link to="/" className="text-xl font-heading font-bold">
              <span className="text-foreground">PRIME</span>
              <span className="text-gradient">HAVEN</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium">
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Upload className="w-5 h-5" />
              Submit Work
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Wallet className="w-5 h-5" />
              Payments
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Settings className="w-5 h-5" />
              Settings
            </a>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                JD
              </div>
              <div>
                <p className="font-medium text-sm">John Doe</p>
                <p className="text-xs text-muted-foreground">UI/UX Designer</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-heading font-bold">Dashboard</span>
          <div className="w-6" />
        </div>

        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-heading font-bold mb-2">
            Welcome back, <span className="text-gradient">John</span>
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your performance this month.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-heading font-bold mb-1">{stat.value}</p>
              <p className="text-muted-foreground text-sm">{stat.label}</p>
              <p className="text-xs text-primary mt-2">{stat.trend}</p>
            </motion.div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-xl font-heading font-bold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'approved' ? 'bg-green-500' :
                      activity.type === 'preference' ? 'bg-primary' :
                      activity.type === 'revision' ? 'bg-yellow-500' :
                      'bg-muted-foreground'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{activity.project}</p>
                      <p className="text-xs text-muted-foreground capitalize">{activity.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.points > 0 && (
                      <p className="text-sm text-primary font-medium">+{activity.points} pts</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-xl font-heading font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button variant="primary" className="w-full justify-start">
                <Upload className="w-4 h-4 mr-2" />
                Submit New Work
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Wallet className="w-4 h-4 mr-2" />
                Update Payment Method
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Points System:</strong><br />
                • Submission: +15 pts<br />
                • Client Preference: +40 pts<br />
                • Revision: +5 pts
              </p>
            </div>
          </motion.div>
        </div>

        {/* Demo Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 p-4 glass rounded-xl text-center"
        >
          <p className="text-sm text-muted-foreground">
            <strong className="text-primary">Demo Mode</strong> — Connect Lovable Cloud to enable full dashboard functionality with real data.
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
