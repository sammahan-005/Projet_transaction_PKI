import { useCallback, useState } from 'react';
import { router } from '@inertiajs/react';
import QRScanner from '../components/QRScanner';

function ScanPage() {
  const [searching, setSearching] = useState(false);

  const handleQRScan = useCallback(async (data: string) => {
    console.log('Scanned QR code:', data);
    
    const accountNumber = data.trim();
    if (!accountNumber) {
      alert('Code QR vide. Veuillez scanner un code valide.');
      return;
    }

    // Account numbers typically start with "PC" and are 20 characters
    // Accept any account number format from QR code
    setSearching(true);

    try {
      // Search for beneficiary by account number via API
      const response = await fetch(`/api/beneficiary?account_number=${encodeURIComponent(accountNumber)}`);
      const result = await response.json();

      if (result.success && result.beneficiary) {
        // Store beneficiary in sessionStorage to avoid URL length issues
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('selectedBeneficiary', JSON.stringify(result.beneficiary));
        }
        router.visit('/send-amount');
      } else {
        alert(`Compte non trouvé: ${accountNumber}\n\nAssurez-vous que le code QR est valide et appartient à un compte actif.`);
      }
    } catch (error) {
      console.error('Error searching beneficiary:', error);
      alert('Erreur lors de la recherche du compte. Veuillez réessayer.');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    router.visit('/send');
  }, []);

  return (
    <QRScanner
      onScan={handleQRScan}
      onClose={handleClose}
    />
  );
}

export default ScanPage;
