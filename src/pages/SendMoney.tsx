import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, ArrowLeft } from 'lucide-react';
import QRScanner from '../components/QRScanner';
import BottomNav from '../components/BottomNav';

interface Beneficiary {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
}

function SendMoney() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const beneficiaries = useMemo<Beneficiary[]>(
    () => [
      {
        id: '1',
        name: 'Jean Dupont',
        username: '@jeandupont',
        avatarUrl: 'https://i.pravatar.cc/150?img=12',
      },
      {
        id: '2',
        name: 'Marie Martin',
        username: '@mariemartin',
        avatarUrl: 'https://i.pravatar.cc/150?img=5',
      },
      {
        id: '3',
        name: 'Pierre Bernard',
        username: '@pierrebernard',
        avatarUrl: 'https://i.pravatar.cc/150?img=33',
      },
      {
        id: '4',
        name: 'Sophie Laurent',
        username: '@sophielaurent',
        avatarUrl: 'https://i.pravatar.cc/150?img=9',
      },
      {
        id: '5',
        name: 'Luc Dubois',
        username: '@lucdubois',
        avatarUrl: 'https://i.pravatar.cc/150?img=68',
      },
    ],
    []
  );

  const filteredBeneficiaries = useMemo(() => {
    if (!searchQuery) return beneficiaries;
    const query = searchQuery.toLowerCase();
    return beneficiaries.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.username.toLowerCase().includes(query)
    );
  }, [beneficiaries, searchQuery]);

  const handleSelectBeneficiary = useCallback((beneficiary: Beneficiary) => {
    console.log('Selected:', beneficiary);
    navigate('/send-amount', { state: { beneficiary } });
  }, [navigate]);

  const handleQRScan = useCallback((data: string) => {
    console.log('Scanned QR code:', data);
    setShowScanner(false);
    // Find beneficiary with scanned ID or show error
    const beneficiary = beneficiaries.find(b => b.username === data || b.id === data);
    if (beneficiary) {
      handleSelectBeneficiary(beneficiary);
    } else {
      alert(`Code scanné: ${data}\nBénéficiaire non trouvé.`);
    }
  }, [beneficiaries, handleSelectBeneficiary]);

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
          <h1 className="text-xl font-bold text-gray-800">Envoyer de l'argent</h1>
        </div>
      </header>

      {/* QR Scanner Button */}
      <div className="px-6 py-6">
        <button
          onClick={() => setShowScanner(true)}
          className="w-full bg-linear-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] hover:opacity-90 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3"
        >
          <QrCode className="w-6 h-6" />
          <span>Scanner le code QR</span>
        </button>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Search Bar */}
      <div className="px-6 pb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent"
          />
        </div>
      </div>

      {/* Beneficiaries List */}
      <div className="px-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Bénéficiaires</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredBeneficiaries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun bénéficiaire trouvé
            </div>
          ) : (
            filteredBeneficiaries.map((beneficiary) => (
              <button
                key={beneficiary.id}
                onClick={() => handleSelectBeneficiary(beneficiary)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <img
                  src={beneficiary.avatarUrl}
                  alt={beneficiary.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-800">
                    {beneficiary.name}
                  </p>
                  <p className="text-xs text-gray-500">{beneficiary.username}</p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default SendMoney;
