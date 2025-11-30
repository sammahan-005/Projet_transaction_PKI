import { router } from '@inertiajs/react';
import { 
  ArrowLeft, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Key,
  FileText,
  Lock,
  Copy,
  Check,
  Fingerprint,
  Clock,
  User,
  CreditCard
} from 'lucide-react';
import { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';

interface DisputeDetailProps {
  disputeType: string;
  transaction?: {
    id: number;
    amount: number;
    status: string;
    transaction_hash: string;
    digital_signature: string;
    created_at: string;
    sender: {
      name: string;
      email: string;
      account_number: string;
      public_key: string;
    };
    receiver: {
      name: string;
      account_number: string;
    };
  };
  verification?: {
    hash_verified: boolean;
    signature_verified: boolean;
    certificate_verified: boolean;
    transaction_data_integrity: boolean;
    conclusion: string;
  };
}

function DisputeDetail({ disputeType, transaction, verification }: DisputeDetailProps) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const [copied, setCopied] = useState<string | null>(null);

  const disputeTypes: Record<string, {
    title: string;
    description: string;
    userClaim: string;
    icon: typeof XCircle;
    color: string;
  }> = {
    transaction_denial: {
      title: 'Cas 1 : Déni de Transaction',
      description: 'Utilisateur nie avoir effectué une transaction',
      userClaim: 'Je n\'ai jamais effectué cette transaction. Mon compte a été piraté.',
      icon: XCircle,
      color: 'text-red-600',
    },
    transaction_modification: {
      title: 'Cas 2 : Modification de Transaction',
      description: 'Utilisateur prétend que les détails ont été modifiés',
      userClaim: 'J\'ai envoyé seulement 50₱, pas 500₱. Le montant a été modifié après signature.',
      icon: AlertTriangle,
      color: 'text-yellow-600',
    },
    account_compromise: {
      title: 'Cas 3 : Compromission de Compte',
      description: 'Utilisateur prétend que son compte a été compromis',
      userClaim: 'Mon compte a été compromis. Quelqu\'un d\'autre a utilisé ma clé privée.',
      icon: Shield,
      color: 'text-blue-600',
    },
    transaction_rejection: {
      title: 'Cas 4 : Transaction Rejetée',
      description: 'Transaction rejetée - Preuve de non-conformité',
      userClaim: 'Ma transaction a été rejetée. Pourquoi?',
      icon: FileText,
      color: 'text-gray-600',
    },
  };

  const disputeInfo = disputeTypes[disputeType] || disputeTypes.transaction_denial;
  const Icon = disputeInfo.icon;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // Données de démonstration si pas de transaction réelle
  const displayTransaction = transaction || {
    id: 1,
    amount: 500.00,
    status: 'approved',
    transaction_hash: '08caab325166dbbc0db08029b4185f3ed90c137bee75ee54d55c453939779854',
    digital_signature: 'qXajjIaAI/ZbtqU29+ALAcyrknSSoP1eIl1mSGDi7g9EV2m9JX...',
    created_at: '2025-11-29T08:04:59Z',
    sender: {
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      account_number: 'PC753185489426761774',
      public_key: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END PUBLIC KEY-----',
    },
    receiver: {
      name: 'Bahanack Georges Yvan',
      account_number: 'PC631960645933291714',
    },
  };

  const displayVerification = verification || {
    hash_verified: true,
    signature_verified: true,
    certificate_verified: true,
    transaction_data_integrity: true,
    conclusion: 'La transaction est authentique et intègre. La signature numérique vérifiée prouve que l\'utilisateur a bien effectué cette transaction.',
    transaction_data: `PC753185489426761774PC631960645933291714000050000`,
  };

  const transactionData = displayVerification.transaction_data || 
    (displayTransaction ? `${displayTransaction.sender.account_number}${displayTransaction.receiver.account_number}${Math.floor(displayTransaction.amount * 100).toString().padStart(9, '0')}` : 
    `PC753185489426761774PC631960645933291714000050000`);
  const transactionHash = displayTransaction.transaction_hash;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar currentPath={currentPath} />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white px-6 py-4 sticky top-0 z-10 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.visit('/admin/disputes')}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{disputeInfo.title}</h1>
              <p className="text-sm text-gray-500 mt-1">{disputeInfo.description}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Claim */}
          <div className="bg-white p-6 border border-gray-200">
            <div className="flex items-start gap-4">
              <div className="p-3">
                <Icon className={`w-6 h-6 ${disputeInfo.color}`} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-red-800 mb-2">Réclamation de l'Utilisateur</h2>
                <p className="text-red-700 font-medium italic">"{disputeInfo.userClaim}"</p>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-white p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#FF8C00]" />
              Détails de la Transaction
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Montant</p>
                <p className="text-xl font-bold text-gray-800">
                  {displayTransaction.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₱
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Statut</p>
                <p className={`text-lg font-semibold ${
                  displayTransaction.status === 'approved' ? 'text-green-600' : 
                  displayTransaction.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {displayTransaction.status === 'approved' ? 'Approuvée' : 
                   displayTransaction.status === 'rejected' ? 'Rejetée' : 'En attente'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Expéditeur</p>
                <p className="font-semibold text-gray-800">{displayTransaction.sender.name}</p>
                <p className="text-sm text-gray-600">{displayTransaction.sender.account_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Destinataire</p>
                <p className="font-semibold text-gray-800">{displayTransaction.receiver.name}</p>
                <p className="text-sm text-gray-600">{displayTransaction.receiver.account_number}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-1">Date et Heure</p>
                <p className="text-gray-800">
                  {new Date(displayTransaction.created_at).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* PKI Verification Evidence */}
          <div className="bg-white p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#FF8C00]" />
              Preuve PKI - Vérification Cryptographique
            </h2>

            {/* Verification Steps */}
            <div className="space-y-4 mb-6">
              {/* Step 1: Transaction Data */}
              <div className="pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h3 className="font-bold text-gray-800">Données de Transaction Originales</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Format: <code className="bg-gray-50 px-2 py-1 border border-gray-200">expéditeur + destinataire + montant (9 chiffres)</code>
                </p>
                <div className="bg-gray-50 p-3 font-mono text-sm flex items-center justify-between border border-gray-200">
                  <span className="text-gray-700 break-all">{transactionData}</span>
                  <button
                    onClick={() => copyToClipboard(transactionData, 'data')}
                    className="ml-2 p-1 rounded"
                  >
                    {copied === 'data' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                </div>
              </div>

              {/* Step 2: Hash Verification */}
              <div className="pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-green-700 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h3 className="font-bold text-gray-800">Vérification du Hash (Intégrité)</h3>
                  {displayVerification.hash_verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Le hash SHA-256 garantit que les données n'ont pas été modifiées.
                </p>
                <div className="bg-gray-50 p-3 font-mono text-xs flex items-center justify-between border border-gray-200">
                  <span className="text-gray-700 break-all">{transactionHash}</span>
                  <button
                    onClick={() => copyToClipboard(transactionHash, 'hash')}
                    className="ml-2 p-1 rounded"
                  >
                    {copied === 'hash' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                </div>
                <div className={`mt-2 p-2 ${displayVerification.hash_verified ? 'text-green-700' : 'text-red-700'}`}>
                  <p className="text-sm font-semibold">
                    {displayVerification.hash_verified ? '✅ Hash vérifié : Les données sont intègres' : '❌ Hash invalide : Les données ont été modifiées'}
                  </p>
                </div>
              </div>

              {/* Step 3: Signature Verification */}
              <div className="pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <h3 className="font-bold text-gray-800">Vérification de la Signature (Authenticité)</h3>
                  {displayVerification.signature_verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  La signature RSA vérifie que la transaction a été signée avec la clé privée du compte expéditeur.
                </p>
                <div className="bg-gray-50 p-3 font-mono text-xs flex items-center justify-between border border-gray-200">
                  <span className="text-gray-700 break-all">{displayTransaction.digital_signature.substring(0, 50)}...</span>
                  <button
                    onClick={() => copyToClipboard(displayTransaction.digital_signature, 'signature')}
                    className="ml-2 p-1 rounded"
                  >
                    {copied === 'signature' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Clé Publique Utilisée</p>
                    <p className="text-xs text-gray-700 font-mono break-all">
                      {displayTransaction.sender.public_key.substring(0, 50)}...
                    </p>
                  </div>
                  <div className={`bg-gray-50 p-3 border border-gray-200 ${displayVerification.signature_verified ? '' : ''}`}>
                    <p className={`text-sm font-semibold ${displayVerification.signature_verified ? 'text-green-700' : 'text-red-700'}`}>
                      {displayVerification.signature_verified ? '✅ Signature valide' : '❌ Signature invalide'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {displayVerification.signature_verified 
                        ? 'La signature correspond à la clé publique du compte'
                        : 'La signature ne correspond pas'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4: Certificate Verification */}
              <div className="pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-orange-700 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <h3 className="font-bold text-gray-800">Vérification du Certificat (Chaîne de Confiance)</h3>
                  {displayVerification.certificate_verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Le certificat signé par l'Autorité de Certification établit la confiance.
                </p>
                <div className={`p-3 ${displayVerification.certificate_verified ? 'text-green-700' : 'text-red-700'}`}>
                  <p className="text-sm font-semibold">
                    {displayVerification.certificate_verified 
                      ? '✅ Certificat valide et signé par la CA'
                      : '❌ Certificat invalide ou non vérifié'}
                  </p>
                </div>
              </div>
            </div>

            {/* Conclusion */}
            <div className="bg-gray-50 p-6 border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="p-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-800 mb-2">
                    Conclusion de l'Investigation PKI
                  </h3>
                  <p className="text-green-700 mb-3">{displayVerification.conclusion}</p>
                  <div className="bg-white p-4 space-y-2 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">L'intégrité des données est prouvée</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">L'authenticité du signataire est vérifiée</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">La non-répudiation est garantie</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">La chaîne de confiance PKI est validée</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PKI Security Properties */}
          <div className="bg-white p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-[#FF8C00]" />
              Propriétés de Sécurité PKI Démontrées
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-800">Authentification</h3>
                </div>
                <p className="text-sm text-gray-600">
                  La vérification de la signature avec la clé publique prouve que seul le détenteur
                  de la clé privée correspondante a pu signer cette transaction.
                </p>
              </div>
              <div className="bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-800">Intégrité</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Le hash SHA-256 garantit que toute modification des données de transaction
                  serait immédiatement détectée lors de la vérification.
                </p>
              </div>
              <div className="bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-800">Non-Répudiation</h3>
                </div>
                <p className="text-sm text-gray-600">
                  L'utilisateur ne peut pas nier avoir effectué la transaction car seul lui
                  possède la clé privée qui a créé cette signature unique.
                </p>
              </div>
              <div className="bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-gray-800">Traçabilité</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Tous les éléments cryptographiques (hash, signature, certificat) sont
                  enregistrés de manière permanente pour un audit complet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisputeDetail;

