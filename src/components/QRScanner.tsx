import { memo, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner = memo(({ onScan, onClose }: QRScannerProps) => {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: any) => {
    if (result && result[0]?.rawValue) {
      onScan(result[0].rawValue);
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scanner Error:', error);
    setError('Erreur d\'accès à la caméra. Veuillez vérifier les permissions.');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black bg-opacity-50 px-6 py-4 flex items-center justify-between">
        <h2 className="text-white text-lg font-bold">Scanner le code QR</h2>
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Scanner */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {error ? (
            <div className="bg-red-500 bg-opacity-20 border-2 border-red-500 rounded-2xl p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-white text-sm mb-4">{error}</p>
              <button
                onClick={() => setError(null)}
                className="bg-white text-gray-900 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{
                    facingMode: 'environment',
                  }}
                  styles={{
                    container: {
                      width: '100%',
                      paddingTop: '100%',
                      position: 'relative',
                    },
                    video: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    },
                  }}
                />
              </div>

              {/* Scanning Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-4 border-[#FF8C00] rounded-3xl opacity-50" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#FF8C00]" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#FF8C00]" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#FF8C00]" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#FF8C00]" />
                </div>
              </div>
            </div>
          )}

          <p className="text-white text-center mt-6 text-sm opacity-80">
            Positionnez le code QR dans le cadre pour le scanner
          </p>
        </div>
      </div>
    </div>
  );
});

QRScanner.displayName = 'QRScanner';

export default QRScanner;
