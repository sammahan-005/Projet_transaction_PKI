import { router } from '@inertiajs/react';
import { Shield, Key, Users, TrendingUp } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';

interface AdminDashboardProps {
  stats?: {
    total_transactions: number;
    total_users: number;
    total_accounts: number;
    total_certificates: number;
  };
}

function AdminDashboard({ stats = {
  total_transactions: 0,
  total_users: 0,
  total_accounts: 0,
  total_certificates: 0,
} }: AdminDashboardProps) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar currentPath={currentPath} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white px-6 py-4 sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Tableau de bord</h1>
            <p className="text-xs text-gray-500 mt-1">Vue d'ensemble du système</p>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-sm opacity-90 mb-1">Transactions</p>
              <p className="text-3xl font-bold">{stats.total_transactions}</p>
            </div>

            <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-sm opacity-90 mb-1">Utilisateurs</p>
              <p className="text-3xl font-bold">{stats.total_users}</p>
            </div>

            <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Key className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-sm opacity-90 mb-1">Comptes</p>
              <p className="text-3xl font-bold">{stats.total_accounts}</p>
            </div>

            <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-sm opacity-90 mb-1">Certificats</p>
              <p className="text-3xl font-bold">{stats.total_certificates}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

