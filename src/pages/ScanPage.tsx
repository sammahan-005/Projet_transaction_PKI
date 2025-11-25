import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../components/QRScanner';

function ScanPage() {
  const navigate = useNavigate();

  const handleQRScan = useCallback((data: string) => {
    console.log('Scanned QR code:', data);

    // Check if it's a Pipocoin user ID
    if (data.startsWith('PIPOCOIN_USER_')) {
      // Navigate to send money page with the scanned user
      navigate('/send', { state: { scannedUserId: data } });
    } else {
      // Show error and go back
      alert(`Code QR invalide: ${data}\nVeuillez scanner un code Pipocoin valide.`);
      navigate(-1);
    }
  }, [navigate]);

  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <QRScanner
      onScan={handleQRScan}
      onClose={handleClose}
    />
  );
}

export default ScanPage;
