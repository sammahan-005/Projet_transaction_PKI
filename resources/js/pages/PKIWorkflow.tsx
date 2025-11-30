import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { 
  User, 
  Shield, 
  UserCheck, 
  CheckCircle, 
  Key, 
  Lock, 
  FileCheck,
  ArrowRight,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';

interface PKIWorkflowProps {
  transactions: Array<{
    transaction: {
      id: number;
      amount: number;
      status: string;
      transaction_hash: string;
      digital_signature: string;
      created_at: string;
    };
    sender: {
      entity: string;
      name: string;
      email: string;
      account_number: string;
      public_key: string;
      private_key: string | null;
    };
    ca: {
      entity: string;
      name: string;
      email: string;
      account_number: string;
      public_key: string;
      note: string;
    };
    receiver: {
      entity: string;
      name: string;
      email: string;
      account_number: string;
      public_key: string;
    };
    certificate: {
      id: number;
      serial_number: string;
      issuer: string;
      subject: string;
      signature: string;
      issued_at: string;
      expires_at: string;
      certificate_data: string;
      parsed_data: any;
    } | null;
  }>;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

type WorkflowStep = 
  | 'sender-public-key'
  | 'sender-private-key'
  | 'ca-processing'
  | 'receiver-processing'
  | 'transaction-success'
  | 'certificate';

function PKIWorkflow({ transactions = [] }: PKIWorkflowProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(
    transactions.length > 0 ? transactions[0].transaction.id : null
  );
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('sender-public-key');
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [generatingSteps, setGeneratingSteps] = useState<Set<WorkflowStep>>(new Set());
  const [matrixContent, setMatrixContent] = useState<{ [key: string]: string }>({});

  const selectedTx = transactions.find(t => t.transaction.id === selectedTransaction);

  // Matrix animation effect
  useEffect(() => {
    if (!selectedTx) return;

    const currentStepKey = currentStep;
    
    // Start generation animation when step becomes active
    setGeneratingSteps(prev => new Set([...prev, currentStepKey]));
    
    // Generate matrix content for this step
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const generateMatrix = () => {
      let matrix = '';
      const lines = 15; // Number of lines to simulate
      for (let i = 0; i < lines; i++) {
        let line = '';
        for (let j = 0; j < 64; j++) {
          line += chars[Math.floor(Math.random() * chars.length)];
        }
        matrix += line + '\n';
      }
      return matrix;
    };

    // Initialize matrix content
    setMatrixContent(prev => ({
      ...prev,
      [currentStepKey]: generateMatrix()
    }));

    // Update matrix content every 100ms during generation
    const matrixInterval = setInterval(() => {
      setMatrixContent(prev => ({
        ...prev,
        [currentStepKey]: generateMatrix()
      }));
    }, 100);

    // After 4 seconds, stop generation and show real content
    const revealTimeout = setTimeout(() => {
      setGeneratingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentStepKey);
        return newSet;
      });
      clearInterval(matrixInterval);
    }, 4000);

    return () => {
      clearInterval(matrixInterval);
      clearTimeout(revealTimeout);
    };
  }, [currentStep, selectedTx]);

  // Auto-progress through steps
  useEffect(() => {
    if (!selectedTx) return;

    const stepOrder: WorkflowStep[] = [
      'sender-public-key',
      'sender-private-key',
      'ca-processing',
      'receiver-processing',
      'transaction-success',
      'certificate',
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < stepOrder.length) {
        setCurrentStep(stepOrder[stepIndex]);
      } else {
        clearInterval(interval);
      }
    }, 6000); // 6 seconds per step to simulate real key generation

    return () => clearInterval(interval);
  }, [selectedTransaction]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeys(new Set([...copiedKeys, key]));
    setTimeout(() => {
      const newCopied = new Set(copiedKeys);
      newCopied.delete(key);
      setCopiedKeys(newCopied);
    }, 2000);
  };

  const formatKey = (key: string) => {
    if (!key) return 'Non disponible';
    return key; // Show full key, no truncation
  };

  const translateStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'approved': 'approuvé',
      'pending': 'en attente',
      'rejected': 'rejeté',
      'failed': 'échoué',
    };
    return statusMap[status] || status;
  };

  const getStepStatus = (step: WorkflowStep) => {
    if (!selectedTx) return 'pending';
    const stepOrder: WorkflowStep[] = [
      'sender-public-key',
      'sender-private-key',
      'ca-processing',
      'receiver-processing',
      'transaction-success',
      'certificate',
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  if (!selectedTx) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <AdminSidebar currentPath={currentPath} />
        <div className="flex-1 ml-64 p-6">
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-500">Aucune transaction disponible</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar currentPath={currentPath} />
      
      <div className="flex-1 ml-64">
        <header className="bg-white px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Workflow PKI</h1>
              <p className="text-xs text-gray-500 mt-1">Visualisation du processus PKI</p>
            </div>
            {transactions.length > 1 && (
              <select
                value={selectedTransaction}
                onChange={(e) => {
                  setSelectedTransaction(Number(e.target.value));
                  setCurrentStep('sender-public-key');
                }}
                className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF8C00]"
              >
                {transactions.map((tx) => (
                  <option key={tx.transaction.id} value={tx.transaction.id}>
                    Transaction n°{tx.transaction.id} - {tx.transaction.amount}₱
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>

        <div className="p-6">
          {/* Transaction Info Card */}
          <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-6 text-white mb-6">
            <div>
              <p className="text-sm opacity-90 mb-1">Transaction n°{selectedTx.transaction.id}</p>
              <p className="text-3xl font-bold">
                {selectedTx.transaction.amount.toLocaleString('fr-FR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ₱
              </p>
              <p className="text-sm opacity-80 mt-2">
                {new Date(selectedTx.transaction.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Timeline Workflow */}
          <div className="bg-white rounded-2xl p-6">
            <div className="space-y-8">
              {/* Step 1: Sender - Public Key */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                    getStepStatus('sender-public-key') === 'completed'
                      ? 'bg-[#FF8C00] text-white'
                      : getStepStatus('sender-public-key') === 'active'
                      ? 'bg-[#FF8C00] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    <User className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">Expéditeur</h3>
                      {getStepStatus('sender-public-key') === 'active' && (
                        <Sparkles className="w-4 h-4 text-[#FF8C00]" />
                      )}
                      {getStepStatus('sender-public-key') === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-[#FF8C00]" />
                      )}
                    </div>
                    
                    {getStepStatus('sender-public-key') !== 'pending' && (
                      <div className={`mt-4 space-y-3 transition-all duration-500 ${
                        getStepStatus('sender-public-key') === 'active' 
                          ? 'opacity-100 translate-x-0' 
                          : 'opacity-100'
                      }`}>
                        {getStepStatus('sender-public-key') === 'active' && (
                          <div className="flex items-center gap-2 text-sm text-[#FF8C00] mb-2">
                            <div className="w-2 h-2 bg-[#FF8C00] rounded-full"></div>
                            <span className="font-medium">Génération de la clé publique...</span>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-600 mb-2 font-medium">Clé publique</p>
                          <div className="flex items-start gap-2">
                            {generatingSteps.has('sender-public-key') ? (
                              <code className="text-xs font-mono text-[#FF8C00] break-all flex-1 whitespace-pre-wrap">
                                {matrixContent['sender-public-key'] || 'Génération en cours...'}
                              </code>
                            ) : (
                              <code className="text-xs font-mono text-gray-700 break-all flex-1 whitespace-pre-wrap">
                                {formatKey(selectedTx.sender.public_key)}
                              </code>
                            )}
                            {!generatingSteps.has('sender-public-key') && (
                              <button
                                onClick={() => copyToClipboard(selectedTx.sender.public_key, 'sender-pub')}
                                className="flex-shrink-0"
                              >
                                {copiedKeys.has('sender-pub') ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400 hover:text-[#FF8C00]" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {getStepStatus('sender-public-key') !== 'pending' && (
                  <div className="absolute left-8 top-16 w-0.5 h-8 bg-[#FF8C00]"></div>
                )}
              </div>

              {/* Step 2: Sender - Private Key */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                    getStepStatus('sender-private-key') === 'completed'
                      ? 'bg-[#FF8C00] text-white'
                      : getStepStatus('sender-private-key') === 'active'
                      ? 'bg-[#FF8C00] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">Clé privée de l'expéditeur</h3>
                      {getStepStatus('sender-private-key') === 'active' && (
                        <Sparkles className="w-4 h-4 text-[#FF8C00]" />
                      )}
                      {getStepStatus('sender-private-key') === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-[#FF8C00]" />
                      )}
                    </div>
                    
                    {getStepStatus('sender-private-key') !== 'pending' && (
                      <div className={`mt-4 space-y-3 transition-all duration-500 ${
                        getStepStatus('sender-private-key') === 'active' 
                          ? 'opacity-100 translate-x-0' 
                          : 'opacity-100'
                      }`}>
                        {getStepStatus('sender-private-key') === 'active' && (
                          <div className="flex items-center gap-2 text-sm text-[#FF8C00] mb-2">
                            <div className="w-2 h-2 bg-[#FF8C00] rounded-full"></div>
                            <span className="font-medium">Déchiffrement de la clé privée...</span>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-600 mb-2 font-medium">Clé privée (déchiffrée)</p>
                          <div className="flex items-start gap-2">
                            {generatingSteps.has('sender-private-key') ? (
                              <code className="text-xs font-mono text-[#FF8C00] break-all flex-1 whitespace-pre-wrap">
                                {matrixContent['sender-private-key'] || 'Déchiffrement en cours...'}
                              </code>
                            ) : (
                              <code className="text-xs font-mono text-gray-700 break-all flex-1 whitespace-pre-wrap">
                                {selectedTx.sender.private_key 
                                  ? formatKey(selectedTx.sender.private_key)
                                  : 'Non disponible'}
                              </code>
                            )}
                            {!generatingSteps.has('sender-private-key') && selectedTx.sender.private_key && (
                              <button
                                onClick={() => copyToClipboard(selectedTx.sender.private_key!, 'sender-priv')}
                                className="flex-shrink-0"
                              >
                                {copiedKeys.has('sender-priv') ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400 hover:text-[#FF8C00]" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {getStepStatus('sender-private-key') !== 'pending' && (
                  <div className="absolute left-8 top-16 w-0.5 h-8 bg-[#FF8C00]"></div>
                )}
              </div>

              {/* Step 3: CA Processing */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                    getStepStatus('ca-processing') === 'completed'
                      ? 'bg-[#FF8C00] text-white'
                      : getStepStatus('ca-processing') === 'active'
                      ? 'bg-[#FF8C00] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    <Shield className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">Autorité de Certification (AC)</h3>
                      {getStepStatus('ca-processing') === 'active' && (
                        <Sparkles className="w-4 h-4 text-[#FF8C00]" />
                      )}
                      {getStepStatus('ca-processing') === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-[#FF8C00]" />
                      )}
                    </div>
                    
                    {getStepStatus('ca-processing') !== 'pending' && (
                      <div className={`mt-4 space-y-3 transition-all duration-500 ${
                        getStepStatus('ca-processing') === 'active' 
                          ? 'opacity-100 translate-x-0' 
                          : 'opacity-100'
                      }`}>
                        {getStepStatus('ca-processing') === 'active' && (
                          <div className="flex items-center gap-2 text-sm text-[#FF8C00] mb-2">
                            <div className="w-2 h-2 bg-[#FF8C00] rounded-full"></div>
                            <span className="font-medium">Vérification et signature par l'AC...</span>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Nom:</span> {selectedTx.ca.name}
                          </p>
                          <p className="text-xs text-gray-600 italic mb-3">{selectedTx.ca.note}</p>
                          <p className="text-xs text-gray-600 mb-2 font-medium">Clé publique (AC)</p>
                          <div className="flex items-start gap-2">
                            {generatingSteps.has('ca-processing') ? (
                              <code className="text-xs font-mono text-[#FF8C00] break-all flex-1 whitespace-pre-wrap">
                                {matrixContent['ca-processing'] || 'Vérification en cours...'}
                              </code>
                            ) : (
                              <code className="text-xs font-mono text-gray-700 break-all flex-1 whitespace-pre-wrap">
                                {formatKey(selectedTx.ca.public_key)}
                              </code>
                            )}
                            {!generatingSteps.has('ca-processing') && (
                              <button
                                onClick={() => copyToClipboard(selectedTx.ca.public_key, 'ca-pub')}
                                className="flex-shrink-0"
                              >
                                {copiedKeys.has('ca-pub') ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400 hover:text-[#FF8C00]" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {getStepStatus('ca-processing') !== 'pending' && (
                  <div className="absolute left-8 top-16 w-0.5 h-8 bg-[#FF8C00]"></div>
                )}
              </div>

              {/* Step 4: Receiver Processing */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                    getStepStatus('receiver-processing') === 'completed'
                      ? 'bg-[#FF8C00] text-white'
                      : getStepStatus('receiver-processing') === 'active'
                      ? 'bg-[#FF8C00] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    <UserCheck className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">Destinataire</h3>
                      {getStepStatus('receiver-processing') === 'active' && (
                        <Sparkles className="w-4 h-4 text-[#FF8C00]" />
                      )}
                      {getStepStatus('receiver-processing') === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-[#FF8C00]" />
                      )}
                    </div>
                    
                    {getStepStatus('receiver-processing') !== 'pending' && (
                      <div className={`mt-4 space-y-3 transition-all duration-500 ${
                        getStepStatus('receiver-processing') === 'active' 
                          ? 'opacity-100 translate-x-0' 
                          : 'opacity-100'
                      }`}>
                        {getStepStatus('receiver-processing') === 'active' && (
                          <div className="flex items-center gap-2 text-sm text-[#FF8C00] mb-2">
                            <div className="w-2 h-2 bg-[#FF8C00] rounded-full"></div>
                            <span className="font-medium">Vérification de la clé publique du destinataire...</span>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Nom:</span> {selectedTx.receiver.name}
                          </p>
                          <p className="text-xs text-gray-600 mb-2 font-medium">Clé publique</p>
                          <div className="flex items-start gap-2">
                            {generatingSteps.has('receiver-processing') ? (
                              <code className="text-xs font-mono text-[#FF8C00] break-all flex-1 whitespace-pre-wrap">
                                {matrixContent['receiver-processing'] || 'Vérification en cours...'}
                              </code>
                            ) : (
                              <code className="text-xs font-mono text-gray-700 break-all flex-1 whitespace-pre-wrap">
                                {formatKey(selectedTx.receiver.public_key)}
                              </code>
                            )}
                            {!generatingSteps.has('receiver-processing') && (
                              <button
                                onClick={() => copyToClipboard(selectedTx.receiver.public_key, 'receiver-pub')}
                                className="flex-shrink-0"
                              >
                                {copiedKeys.has('receiver-pub') ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400 hover:text-[#FF8C00]" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {getStepStatus('receiver-processing') !== 'pending' && (
                  <div className="absolute left-8 top-16 w-0.5 h-8 bg-[#FF8C00]"></div>
                )}
              </div>

              {/* Step 5: Transaction Success */}
              <div className="relative">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                    getStepStatus('transaction-success') === 'completed'
                      ? 'bg-[#FF8C00] text-white'
                      : getStepStatus('transaction-success') === 'active'
                      ? 'bg-[#FF8C00] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">Transaction réussie</h3>
                      {getStepStatus('transaction-success') === 'active' && (
                        <Sparkles className="w-4 h-4 text-[#FF8C00]" />
                      )}
                      {getStepStatus('transaction-success') === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-[#FF8C00]" />
                      )}
                    </div>
                    
                    {getStepStatus('transaction-success') !== 'pending' && (
                      <div className={`mt-4 transition-all duration-500 ${
                        getStepStatus('transaction-success') === 'active' 
                          ? 'opacity-100 translate-x-0' 
                          : 'opacity-100'
                      }`}>
                        {getStepStatus('transaction-success') === 'active' && (
                          <div className="flex items-center gap-2 text-sm text-[#FF8C00] mb-4">
                            <div className="w-2 h-2 bg-[#FF8C00] rounded-full"></div>
                            <span className="font-medium">Transaction validée et approuvée!</span>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-xl p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <CheckCircle className="w-8 h-8 text-[#FF8C00]" />
                            <div>
                              <p className="text-lg font-bold text-gray-800">Transaction approuvée</p>
                              <p className="text-sm text-gray-600">Tous les processus PKI ont été validés avec succès</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1 font-medium">Hash de transaction</p>
                              <code className="text-xs break-all whitespace-pre-wrap">
                                {formatKey(selectedTx.transaction.transaction_hash)}
                              </code>
                            </div>
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1 font-medium">Signature numérique</p>
                              <code className="text-xs break-all whitespace-pre-wrap">
                                {formatKey(selectedTx.transaction.digital_signature)}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {getStepStatus('transaction-success') !== 'pending' && (
                  <div className="absolute left-8 top-16 w-0.5 h-8 bg-[#FF8C00]"></div>
                )}
              </div>

              {/* Step 6: Certificate */}
              {selectedTx.certificate && (
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                      getStepStatus('certificate') === 'completed'
                        ? 'bg-[#FF8C00] text-white'
                        : getStepStatus('certificate') === 'active'
                        ? 'bg-[#FF8C00] text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      <FileCheck className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">Certificat numérique</h3>
                        {getStepStatus('certificate') === 'active' && (
                          <Sparkles className="w-4 h-4 text-[#FF8C00]" />
                        )}
                        {getStepStatus('certificate') === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-[#FF8C00]" />
                        )}
                      </div>
                      
                      {getStepStatus('certificate') !== 'pending' && (
                        <div className={`mt-4 space-y-3 transition-all duration-500 ${
                          getStepStatus('certificate') === 'active' 
                            ? 'opacity-100 translate-x-0' 
                            : 'opacity-100'
                        }`}>
                          {getStepStatus('certificate') === 'active' && (
                            <div className="flex items-center gap-2 text-sm text-[#FF8C00] mb-2">
                              <div className="w-2 h-2 bg-[#FF8C00] rounded-full"></div>
                              <span className="font-medium">Certificat émis par l'AC...</span>
                            </div>
                          )}
                          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">Numéro de série</p>
                              <code className="text-xs font-mono text-gray-700">
                                {selectedTx.certificate.serial_number}
                              </code>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">Émetteur (Issuer)</p>
                              <p className="text-xs text-gray-700">{selectedTx.certificate.issuer}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">Sujet (Subject)</p>
                              <p className="text-xs text-gray-700">{selectedTx.certificate.subject}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">Émis le</p>
                              <p className="text-xs text-gray-700">
                                {new Date(selectedTx.certificate.issued_at).toLocaleString('fr-FR')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">Expire le</p>
                              <p className="text-xs text-gray-700">
                                {new Date(selectedTx.certificate.expires_at).toLocaleString('fr-FR')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1 font-medium">Signature du certificat</p>
                              <div className="flex items-start gap-2">
                                {generatingSteps.has('certificate') ? (
                                  <code className="text-xs font-mono text-[#FF8C00] break-all flex-1 whitespace-pre-wrap">
                                    {matrixContent['certificate'] || 'Génération du certificat...'}
                                  </code>
                                ) : (
                                  <code className="text-xs font-mono text-gray-700 break-all flex-1 whitespace-pre-wrap">
                                    {formatKey(selectedTx.certificate.signature)}
                                  </code>
                                )}
                                {!generatingSteps.has('certificate') && (
                                  <button
                                    onClick={() => copyToClipboard(selectedTx.certificate!.signature, 'cert-sig')}
                                    className="flex-shrink-0"
                                  >
                                    {copiedKeys.has('cert-sig') ? (
                                      <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Copy className="w-4 h-4 text-gray-400 hover:text-[#FF8C00]" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                            {selectedTx.certificate.parsed_data && (
                              <div className="mt-3 pt-3">
                                <p className="text-xs text-gray-600 mb-2 font-medium">Données du certificat</p>
                                <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
                                  {JSON.stringify(selectedTx.certificate.parsed_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2 font-medium">Certificat complet (PEM)</p>
                              <div className="flex items-start gap-2">
                                {generatingSteps.has('certificate') ? (
                                  <code className="text-xs font-mono text-[#FF8C00] break-all flex-1 whitespace-pre-wrap">
                                    {matrixContent['certificate'] || 'Génération du certificat...'}
                                  </code>
                                ) : (
                                  <code className="text-xs font-mono text-gray-700 break-all flex-1 whitespace-pre-wrap">
                                    {formatKey(selectedTx.certificate.certificate_data)}
                                  </code>
                                )}
                                {!generatingSteps.has('certificate') && (
                                  <button
                                    onClick={() => copyToClipboard(selectedTx.certificate!.certificate_data, 'cert-full')}
                                    className="flex-shrink-0"
                                  >
                                    {copiedKeys.has('cert-full') ? (
                                      <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Copy className="w-4 h-4 text-gray-400 hover:text-[#FF8C00]" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PKIWorkflow;
