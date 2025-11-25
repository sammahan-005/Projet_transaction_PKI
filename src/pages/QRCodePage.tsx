import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import BottomNav from '../components/BottomNav';

function QRCodePage() {
  const navigate = useNavigate();
  const userId = 'PIPOCOIN_USER_12345'; // This would come from user context

  const handleDownload = () => {
    const svg = document.getElementById('qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = 'pipocoin-qr-code.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mon code QR Pipocoin',
          text: `Scannez ce code pour m'envoyer des Pipocoins: ${userId}`,
        });
      } catch (error) {
        console.log('Partage annulé');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(userId);
      alert('ID copié dans le presse-papiers!');
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
          <h1 className="text-xl font-bold text-gray-800">Mon code QR</h1>
        </div>
      </header>

      {/* QR Code Display */}
      <div className="flex flex-col items-center px-6 py-12">
        <div className="bg-white rounded-3xl p-8 shadow-2xl mb-6">
          <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] p-6 rounded-2xl mb-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG
                id="qr-code"
                value={userId}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Votre ID Pipocoin</p>
            <p className="text-lg font-bold text-gray-800 break-all">{userId}</p>
          </div>
        </div>

        <p className="text-center text-gray-600 mb-8 max-w-sm">
          Partagez ce code QR pour recevoir des Pipocoins de vos amis et contacts
        </p>

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={handleDownload}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center gap-3 border border-gray-200"
          >
            <Download className="w-5 h-5" />
            <span>Télécharger le QR code</span>
          </button>

          <button
            onClick={handleShare}
            className="w-full bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] hover:opacity-90 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3"
          >
            <Share2 className="w-5 h-5" />
            <span>Partager</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default QRCodePage;
