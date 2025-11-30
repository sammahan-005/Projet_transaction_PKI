import { useState, useCallback, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { QrCode, Search, ArrowLeft } from 'lucide-react';
import QRScanner from '../components/QRScanner';
import BottomNav from '../components/BottomNav';
import DefaultAvatar from '../components/DefaultAvatar';

interface Beneficiary {
  id: string;
  name: string;
  username: string;
  account_number: string;
  avatarUrl?: string | null;
  email?: string;
}

function SendMoney() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Fetch beneficiaries from API
  useEffect(() => {
    fetch('/api/beneficiaries')
      .then(res => res.json())
      .then(data => {
        setBeneficiaries(data.beneficiaries || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching beneficiaries:', error);
        setLoading(false);
      });
  }, []);

  const filteredBeneficiaries = useMemo(() => {
    if (!searchQuery) return beneficiaries;
    const query = searchQuery.toLowerCase().trim();
    return beneficiaries.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.username.toLowerCase().includes(query) ||
        b.account_number.toLowerCase().includes(query)
    );
  }, [beneficiaries, searchQuery]);

  const handleSelectBeneficiary = useCallback((beneficiary: Beneficiary) => {
    console.log('Selected:', beneficiary);
    // Store beneficiary in sessionStorage to avoid URL length issues
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedBeneficiary', JSON.stringify(beneficiary));
    }
    router.visit('/send-amount');
  }, []);

  const handleSearchByAccountNumber = useCallback(async (accountNumber: string) => {
    const trimmed = accountNumber.trim();
    if (!trimmed) return;

    // First check local list
    const localMatch = beneficiaries.find(
      (b) => b.account_number.toLowerCase() === trimmed.toLowerCase()
    );
    if (localMatch) {
      handleSelectBeneficiary(localMatch);
      return;
    }

    // If not found locally, search via API
    setSearching(true);
    setSearchError(null);
    
    try {
      const response = await fetch(`/api/beneficiary?account_number=${encodeURIComponent(trimmed)}`);
      const data = await response.json();
      
      if (data.success && data.beneficiary) {
        // Add to beneficiaries list and select
        setBeneficiaries(prev => {
          const exists = prev.find(b => b.account_number === data.beneficiary.account_number);
          if (exists) return prev;
          return [...prev, data.beneficiary];
        });
        handleSelectBeneficiary(data.beneficiary);
        setSearchError(null);
      } else {
        setSearchError(data.message || 'Compte non trouvé');
      }
    } catch (error) {
      console.error('Error searching beneficiary:', error);
      setSearchError('Erreur lors de la recherche. Veuillez réessayer.');
    } finally {
      setSearching(false);
    }
  }, [beneficiaries, handleSelectBeneficiary]);

  const handleQRScan = useCallback((data: string) => {
    console.log('Scanned QR code:', data);
    setShowScanner(false);
    // Set search query to scanned data
    setSearchQuery(data);
    // Try to find beneficiary with scanned account number
    handleSearchByAccountNumber(data);
  }, [handleSearchByAccountNumber]);

  const handleSearchSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleSearchByAccountNumber(searchQuery);
    }
  }, [searchQuery, handleSearchByAccountNumber]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.visit('/dashboard')}
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
          className="w-full bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] hover:opacity-90 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3"
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
            placeholder="Rechercher par nom, ID ou numéro de compte..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchError(null);
            }}
            onKeyDown={handleSearchSubmit}
            disabled={searching}
            className={`w-full pl-12 pr-4 py-3 bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C00] ${
              searching ? 'opacity-50 cursor-wait' : ''
            }`}
          />
          {searching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-[#FF8C00] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        {searchError && (
          <p className="mt-2 text-sm text-red-600 px-2">{searchError}</p>
        )}
        {searchQuery.trim() && !searching && !searchError && (
          <p className="mt-2 text-xs text-gray-500 px-2">
            Appuyez sur Entrée pour rechercher par numéro de compte
          </p>
        )}
      </div>

      {/* Beneficiaries List */}
      <div className="px-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Bénéficiaires</h2>
        <div className="bg-white rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Chargement...
            </div>
          ) : filteredBeneficiaries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucun bénéficiaire trouvé
            </div>
          ) : (
            filteredBeneficiaries.map((beneficiary) => (
              <button
                key={beneficiary.id}
                onClick={() => handleSelectBeneficiary(beneficiary)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                {beneficiary.avatarUrl ? (
                  <img
                    src={beneficiary.avatarUrl}
                    alt={beneficiary.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <DefaultAvatar name={beneficiary.name} size={48} />
                )}
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-800">
                    {beneficiary.name}
                  </p>
                  <p className="text-xs text-gray-500">{beneficiary.account_number}</p>
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
