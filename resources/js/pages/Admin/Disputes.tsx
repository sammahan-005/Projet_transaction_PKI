import { router } from '@inertiajs/react';
import { AlertTriangle, FileText, Shield, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';

interface DisputesProps {
  disputes?: Array<{
    id: number;
    transaction_id: number;
    type: string;
    status: string;
    user_name: string;
    user_email: string;
    amount: number;
    created_at: string;
    resolved_at?: string;
  }>;
}

function Disputes({ disputes = [] }: DisputesProps) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  // Cas de litiges illustratifs avec PKI
  const illustrativeDisputes = [
    {
      id: 1,
      type: 'transaction_denial',
      title: 'Déni de Transaction',
      description: 'Utilisateur nie avoir effectué une transaction',
      icon: XCircle,
      color: 'text-red-600',
      status: 'resolved',
      conclusion: 'PKI prouve l\'authenticité via signature numérique vérifiée',
    },
    {
      id: 2,
      type: 'transaction_modification',
      title: 'Modification de Transaction',
      description: 'Utilisateur prétend que les détails ont été modifiés',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      status: 'resolved',
      conclusion: 'PKI prouve l\'intégrité via hash SHA-256 vérifié',
    },
    {
      id: 3,
      type: 'account_compromise',
      title: 'Compromission de Compte',
      description: 'Utilisateur prétend que son compte a été compromis',
      icon: Shield,
      color: 'text-blue-600',
      status: 'resolved',
      conclusion: 'PKI prouve la non-répudiation via clé privée unique',
    },
    {
      id: 4,
      type: 'transaction_rejection',
      title: 'Transaction Rejetée',
      description: 'Transaction rejetée - Preuve de non-conformité',
      icon: FileText,
      color: 'text-gray-600',
      status: 'resolved',
      conclusion: 'PKI identifie l\'échec via vérification de signature échouée',
    },
  ];

  const handleViewDispute = (disputeType: string) => {
    router.visit(`/admin/disputes/${disputeType}`);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'resolved') {
      return (
        <span className="px-3 py-1 bg-gray-100 text-green-700 rounded-full text-xs font-semibold">
          Résolu
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-gray-100 text-yellow-700 rounded-full text-xs font-semibold">
        En cours
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar currentPath={currentPath} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white px-6 py-4 sticky top-0 z-10 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestion des Litiges PKI</h1>
            <p className="text-sm text-gray-500 mt-1">
              Cas illustratifs démontrant comment la PKI garantit la conformité et résout les litiges
            </p>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Introduction */}
          <div className="bg-white p-6 mb-6 border border-gray-200">
            <div className="flex items-start gap-4">
              <div className="p-3">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-800 mb-2">
                  Comment la PKI résout les litiges
                </h2>
                <p className="text-sm text-gray-600 mb-3">
                  La Public Key Infrastructure (PKI) fournit des preuves cryptographiques irréfutables
                  pour résoudre les litiges transactionnels. Chaque cas ci-dessous illustre comment
                  la PKI garantit :
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>Authentification</strong> : Vérifie l'identité du signataire</li>
                  <li><strong>Intégrité</strong> : Garantit que les données n'ont pas été modifiées</li>
                  <li><strong>Non-répudiation</strong> : Empêche le déni de transaction</li>
                  <li><strong>Traçabilité</strong> : Fournit un historique complet vérifiable</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Disputes Grid */}
          <div className="grid grid-cols-1 gap-4">
            {illustrativeDisputes.map((dispute) => {
              const Icon = dispute.icon;
              return (
                <div
                  key={dispute.id}
                  className="bg-white p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 ${dispute.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{dispute.title}</h3>
                          {getStatusBadge(dispute.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{dispute.description}</p>
                        <div className="bg-gray-50 p-3 mb-4 border border-gray-100">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-green-800 mb-1">
                                Conclusion PKI :
                              </p>
                              <p className="text-sm text-green-700">{dispute.conclusion}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewDispute(dispute.type)}
                      className="flex items-center gap-2 px-4 py-2 text-[#FF8C00] hover:opacity-90 transition-opacity font-semibold"
                    >
                      <span>Voir les détails</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Information Box */}
          <div className="mt-6 bg-white p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              💡 Fonctionnement de la PKI dans les litiges
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">1. Signature Numérique</h4>
                <p>
                  Chaque transaction est signée avec la clé privée de l'utilisateur, créant une
                  signature unique et non reproductible qui prouve l'authenticité.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">2. Hash de Transaction</h4>
                <p>
                  Le hash SHA-256 des données de transaction garantit l'intégrité. Toute modification
                  changerait le hash et invaliderait la signature.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">3. Certificat PKI</h4>
                <p>
                  Le certificat signé par l'Autorité de Certification (CA) établit une chaîne de
                  confiance et prouve que la clé publique appartient bien au compte.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">4. Vérification</h4>
                <p>
                  La vérification cryptographique avec la clé publique du signataire fournit une
                  preuve irréfutable de l'authenticité et de l'intégrité.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Disputes;

