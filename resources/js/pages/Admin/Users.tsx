import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Users, Plus, Search, Wallet, Mail, Phone } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { useForm } from '@inertiajs/react';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  account: {
    id: number;
    account_number: string;
    balance: number;
    is_active: boolean;
  } | null;
  created_at: string;
}

interface UsersPageProps {
  users: User[];
}

function UsersPage({ users: initialUsers }: UsersPageProps) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data, setData, post, processing, errors, reset } = useForm({
    amount: '',
    reason: '',
  });

  // Filter users based on search term
  const filteredUsers = initialUsers.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.phone && user.phone.includes(searchTerm)) ||
      (user.account && user.account.account_number.includes(searchTerm))
    );
  });

  const handleIncreaseBalance = (user: User) => {
    setSelectedUser(user);
    reset();
    setShowModal(true);
  };

  const submitIncreaseBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    post(`/admin/users/${selectedUser.id}/increase-balance`, {
      onSuccess: () => {
        setShowModal(false);
        setSelectedUser(null);
        reset();
      },
    });
  };

  const formatBalance = (balance: number | null | undefined) => {
    if (balance === null || balance === undefined) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(balance);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar currentPath={currentPath} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white px-6 py-4 sticky top-0 z-10 border-b">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Gestion des utilisateurs</h1>
            <p className="text-xs text-gray-500 mt-1">Gérer les utilisateurs et leurs soldes</p>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone ou numéro de compte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent"
              />
            </div>
          </div>

          {/* Users List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#FF9500] via-[#FF8C00] to-[#E07B00] text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Utilisateur</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Compte</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Solde</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Statut</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <Phone className="w-3 h-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.account ? (
                            <div className="text-sm font-mono text-gray-700">
                              {user.account.account_number}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Aucun compte</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.account ? (
                            <div className="flex items-center gap-2">
                              <Wallet className="w-4 h-4 text-[#FF9500]" />
                              <span className="font-semibold text-gray-900">
                                {formatBalance(user.account.balance)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.account ? (
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.account.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {user.account.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {user.account ? (
                              <button
                                onClick={() => handleIncreaseBalance(user)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF9500] via-[#FF8C00] to-[#E07B00] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                              >
                                <Plus className="w-4 h-4" />
                                Augmenter le solde
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Total utilisateurs</div>
              <div className="text-2xl font-bold text-gray-900">{initialUsers.length}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Comptes actifs</div>
              <div className="text-2xl font-bold text-gray-900">
                {initialUsers.filter((u) => u.account?.is_active).length}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Solde total</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatBalance(
                  initialUsers.reduce((sum, u) => sum + (u.account?.balance || 0), 0)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Increase Balance Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Augmenter le solde de {selectedUser.name}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Solde actuel: {formatBalance(selectedUser.account?.balance)}
            </p>

            <form onSubmit={submitIncreaseBalance}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant à ajouter (FCFA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1000000"
                  value={data.amount}
                  onChange={(e) => setData('amount', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent"
                  placeholder="0.00"
                  required
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison (optionnel)
                </label>
                <textarea
                  value={data.reason}
                  onChange={(e) => setData('reason', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9500] focus:border-transparent"
                  placeholder="Raison de l'augmentation du solde..."
                  rows={3}
                />
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUser(null);
                    reset();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#FF9500] via-[#FF8C00] to-[#E07B00] text-white rounded-xl hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                >
                  {processing ? 'Traitement...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;

