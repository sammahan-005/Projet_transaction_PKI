import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ChevronRight, LogOut, Bell, Lock, HelpCircle, Info } from 'lucide-react';
import BottomNav from '../components/BottomNav';

function Profile() {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      console.log('Logging out...');
      // Handle logout logic here
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Profil</h1>
        </div>
      </header>

      {/* Profile Info */}
      <div className="px-6 py-8">
        <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <img
                src="https://i.pravatar.cc/150?img=15"
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white"
              />
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Camera className="w-4 h-4 text-[#FF8C00]" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Alexer</h2>
              <p className="text-sm opacity-90">@alexer_pipocoin</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white border-opacity-20">
            <div>
              <p className="text-sm opacity-80">ID Pipocoin</p>
              <p className="font-semibold">PIPOCOIN_USER_12345</p>
            </div>
            <div>
              <p className="text-sm opacity-80">Membre depuis</p>
              <p className="font-semibold">Janvier 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="px-6 pb-6">
        <h3 className="text-sm font-bold text-gray-600 mb-3 px-2">Compte</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => navigate('/qrcode')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Mon code QR</p>
                <p className="text-xs text-gray-500">Afficher et partager</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#FF8C00]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Sécurité</p>
                <p className="text-xs text-gray-500">Mot de passe et PIN</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#FF8C00]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
                <p className="text-xs text-gray-500">Gérer les alertes</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF8C00]"></div>
            </label>
          </button>
        </div>
      </div>

      {/* Support */}
      <div className="px-6 pb-6">
        <h3 className="text-sm font-bold text-gray-600 mb-3 px-2">Support</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-[#FF8C00]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Centre d'aide</p>
                <p className="text-xs text-gray-500">FAQ et support</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <Info className="w-5 h-5 text-[#FF8C00]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">À propos</p>
                <p className="text-xs text-gray-500">Version 1.0.0</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-6 pb-6">
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 border border-red-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Se déconnecter</span>
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default Profile;
