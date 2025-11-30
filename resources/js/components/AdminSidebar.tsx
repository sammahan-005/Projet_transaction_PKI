import { router } from '@inertiajs/react';
import { Shield, LayoutDashboard, Home, AlertTriangle, Users } from 'lucide-react';

interface AdminSidebarProps {
  currentPath?: string;
}

function AdminSidebar({ currentPath }: AdminSidebarProps) {
  const isActive = (path: string) => {
    if (!currentPath) return false;
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Tableau de bord',
      path: '/admin/dashboard',
    },
    {
      icon: Users,
      label: 'Utilisateurs',
      path: '/admin/users',
    },
    {
      icon: Shield,
      label: 'Workflow PKI',
      path: '/admin/pki-workflow',
    },
    {
      icon: AlertTriangle,
      label: 'Litiges PKI',
      path: '/admin/disputes',
    },
  ];

  return (
    <aside className="w-64 bg-white h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        {/* Logo/Title */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800">Administration</h2>
          <p className="text-xs text-gray-500 mt-1">Pipocoin Platform</p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.visit(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-gradient-to-r from-[#FF9500] via-[#FF8C00] to-[#E07B00] text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <button
          onClick={() => router.visit('/')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Home className="w-5 h-5 text-gray-500" />
          <span className="font-medium">Retour à l'accueil</span>
        </button>
      </div>
    </aside>
  );
}

export default AdminSidebar;

