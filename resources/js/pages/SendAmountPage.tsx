import { useState, useCallback, FormEventHandler, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, Send } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import DefaultAvatar from '../components/DefaultAvatar';
import { signTransaction, getPrivateKeyLocally, storePrivateKeyLocally, verifyKeyPair } from '../lib/crypto';

/**
 * Interface pour un bénéficiaire
 */
interface Beneficiary {
  id: string;
  name: string;
  username: string;
  account_number: string;
  avatarUrl?: string | null;
}

/**
 * Props de la page SendAmountPage
 */
interface SendAmountPageProps {
  /** Le bénéficiaire sélectionné (peut être passé en prop ou récupéré depuis sessionStorage) */
  beneficiary?: Beneficiary;
  /** Informations du compte de l'utilisateur connecté */
  account?: {
    account_number: string;
  };
}

/**
 * Page d'envoi d'argent (saisie du montant)
 * 
 * Cette page permet à l'utilisateur de :
 * - Voir les informations du bénéficiaire sélectionné
 * - Saisir le montant à envoyer
 * - Confirmer avec son code PIN de transaction
 * - Signer la transaction avec sa clé privée (côté client)
 * - Envoyer la transaction signée au serveur
 * 
 * 🔐 SÉCURITÉ :
 * - La clé privée ne quitte jamais le client
 * - La transaction est signée côté client avant l'envoi
 * - Le code PIN est requis pour autoriser la transaction
 * 
 * @param props Les props de la page
 * @returns Le composant React de la page d'envoi
 */
function SendAmountPage({ beneficiary: propBeneficiary, account }: SendAmountPageProps) {
  // État du bénéficiaire (peut être passé en prop ou récupéré depuis sessionStorage)
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(propBeneficiary ?? null);
  
  // État du montant saisi
  const [amount, setAmount] = useState('');
  
  // État de la note (champ envoyé au backend mais interface utilisateur pas encore implémentée)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [note, setNote] = useState('');
  
  // État du code PIN de transaction
  const [transactionPin, setTransactionPin] = useState('');
  
  // État pour afficher/masquer le modal de saisie du PIN
  const [showPinModal, setShowPinModal] = useState(false);
  
  // État pour indiquer si la transaction est en cours de traitement
  const [processing, setProcessing] = useState(false);
  
  // État pour gérer les erreurs de validation
  const [errors, setErrors] = useState<{ amount?: string; general?: string; pin?: string }>({});

  /**
   * Lit le bénéficiaire depuis sessionStorage si non fourni en prop
   * 
   * Cette fonction permet de récupérer le bénéficiaire sélectionné depuis
   * la page précédente (SendMoney) qui l'a stocké dans sessionStorage.
   * Le bénéficiaire est ensuite supprimé de sessionStorage après lecture.
   */
  useEffect(() => {
    if (!propBeneficiary && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('selectedBeneficiary');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setBeneficiary(parsed);
          // Supprimer de sessionStorage après lecture
          sessionStorage.removeItem('selectedBeneficiary');
        } catch (e) {
          console.error('Échec du parsing du bénéficiaire depuis sessionStorage:', e);
        }
      }
    }
  }, [propBeneficiary]);

  const handleSend: FormEventHandler = useCallback((e) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      setErrors({ amount: 'Veuillez entrer un montant valide' });
      return;
    }

    if (!beneficiary) {
      setErrors({ general: 'Aucun bénéficiaire sélectionné' });
      return;
    }

    // Show PIN modal
    setShowPinModal(true);
    setErrors({});
  }, [amount, beneficiary]);

  const handleConfirmWithPin = useCallback(async () => {
    if (!transactionPin || transactionPin.length !== 4) {
      setErrors({ pin: 'Le code PIN doit contenir 4 chiffres' });
      return;
    }

    if (!account?.account_number) {
      setErrors({ general: 'Informations de compte non disponibles. Veuillez rafraîchir la page.' });
      return;
    }

    setProcessing(true);
    setErrors({});

    try {
      // Get user's private key from localStorage using account number as key
      // The private key is stored with account number as identifier
      if (!account?.account_number) {
        throw new Error('Account number not available.');
      }

      // Try to get private key stored with account number (might be encrypted with PIN)
      let privateKeyPem = await getPrivateKeyLocally(account.account_number, transactionPin);
      
      if (!privateKeyPem) {
        // Fallback: try with email (for new registrations that haven't migrated yet)
        // Get user email from the page or fetch it
        try {
          const accountInfoResponse = await fetch('/api/account-info');
          if (accountInfoResponse.ok) {
            const accountInfo = await accountInfoResponse.json();
            const userEmail = accountInfo.email;
            
            if (userEmail) {
              // Try multiple strategies to find the private key
              let foundKey: string | null = null;
              
              // Strategy 1: Check for unencrypted temp key
              const tempKeyUnencrypted = typeof window !== 'undefined' 
                ? localStorage.getItem(`private_key_temp_unencrypted_${userEmail}`)
                : null;
              
              // Strategy 2: Check if already stored with account number
              const directKey = typeof window !== 'undefined'
                ? localStorage.getItem(`private_key_${account.account_number}`)
                : null;
              
              // Strategy 3: Try to decrypt encrypted temp key with transaction PIN
              const encryptedTempKey = typeof window !== 'undefined'
                ? localStorage.getItem(`private_key_temp_${userEmail}`)
                : null;
              
              if (encryptedTempKey && !encryptedTempKey.includes('BEGIN PRIVATE KEY')) {
                // Key is encrypted, try to decrypt with transaction PIN first
                console.log('Attempting to decrypt private key with transaction PIN...');
                let decryptedKey: string | null = null;
                
                try {
                  decryptedKey = await getPrivateKeyLocally(`temp_${userEmail}`, transactionPin);
                  if (decryptedKey && decryptedKey.includes('BEGIN PRIVATE KEY')) {
                    foundKey = decryptedKey;
                    console.log('Successfully decrypted private key with transaction PIN');
                  }
                } catch {
                  console.log('Failed to decrypt with PIN, key might be encrypted with password');
                  // Key was encrypted with password during registration
                  // We can't decrypt it without password, but we can prompt user
                  // For now, we'll show a helpful error message
                }
                
                // If PIN decryption failed, the key is encrypted with password
                // We need to either get password or re-encrypt with PIN
                // For now, we'll throw an error asking user to re-register or contact support
                if (!foundKey) {
                  throw new Error('La clé privée est chiffrée avec le mot de passe. Veuillez vous reconnecter ou créer un nouveau compte pour utiliser le code PIN.');
                }
              }
              
              // Strategy 4: Search ALL localStorage for ANY unencrypted private key
              if (typeof window !== 'undefined' && !foundKey) {
                const allKeys = Object.keys(localStorage);
                console.log('Searching all localStorage keys for unencrypted private key...');
                console.log('All keys:', allKeys.filter(k => k.includes('private')));
                
                // Check every key that contains "private_key"
                for (const key of allKeys) {
                  if (key.includes('private_key')) {
                    const value = localStorage.getItem(key);
                    if (value && value.includes('BEGIN PRIVATE KEY')) {
                      foundKey = value;
                      console.log('Found unencrypted private key in:', key);
                      break;
                    }
                  }
                }
              }
              
              if (tempKeyUnencrypted) {
                foundKey = tempKeyUnencrypted;
              } else if (directKey) {
                foundKey = directKey;
              }
              
              // If we found a key, migrate it to account number and re-encrypt with PIN
              if (foundKey) {
                // Store with account number, encrypted with transaction PIN for future use
                await storePrivateKeyLocally(account.account_number, foundKey, transactionPin);
                // Also store unencrypted copy for immediate use (will be cleaned up)
                // Clean up temp keys
                if (typeof window !== 'undefined') {
                  localStorage.removeItem(`private_key_temp_unencrypted_${userEmail}`);
                  localStorage.removeItem(`private_key_temp_${userEmail}`);
                  // Also clean up any other temp keys found
                  const allKeys = Object.keys(localStorage);
                  allKeys.filter(k => k.includes('private_key') && k.includes('temp') && k.includes(userEmail))
                    .forEach(k => localStorage.removeItem(k));
                }
                console.log('Private key migrated and encrypted with transaction PIN');
              }
              
              if (foundKey) {
                privateKeyPem = foundKey;
              } else {
                // Debug: log all localStorage keys to help diagnose
                if (typeof window !== 'undefined') {
                  const allPrivateKeys = Object.keys(localStorage).filter(k => k.includes('private_key'));
                  console.error('Private key not found. Available keys:', allPrivateKeys);
                  console.error('Looking for email:', userEmail);
                  console.error('Account number:', account.account_number);
                }
                throw new Error('Clé privée non trouvée. Veuillez vous reconnecter ou créer un nouveau compte.');
              }
            } else {
              throw new Error('Clé privée non trouvée. Veuillez vous reconnecter ou créer un nouveau compte.');
            }
          } else {
            throw new Error('Impossible de récupérer les informations du compte.');
          }
        } catch (error) {
          console.error('Private key retrieval error:', error);
          throw new Error('Clé privée non trouvée. Veuillez vous reconnecter ou créer un nouveau compte.');
        }
      }

      // Validate and trim account numbers to ensure consistency
      const senderAccountNumber = account.account_number.trim();
      const receiverAccountNumber = beneficiary!.account_number.trim();
      
      if (!senderAccountNumber || !receiverAccountNumber) {
        throw new Error('Numéro de compte invalide. Veuillez rafraîchir la page.');
      }

      // Verify that the private key matches the public key stored on the server
      // This prevents signature verification failures due to key mismatches
      try {
        const accountInfoResponse = await fetch('/api/account-info');
        if (accountInfoResponse.ok) {
          const accountInfo = await accountInfoResponse.json();
          if (accountInfo.public_key) {
            const keyPairMatches = await verifyKeyPair(privateKeyPem, accountInfo.public_key);
            if (!keyPairMatches) {
              throw new Error('Votre clé privée ne correspond pas à votre compte. Veuillez vous reconnecter ou créer un nouveau compte.');
            }
            console.log('Key pair verification successful - private key matches public key');
          }
        }
      } catch (error) {
        // If verification fails, log it but continue (might be a network issue)
        if (error instanceof Error && error.message.includes('clé privée')) {
          throw error; // Re-throw if it's a key mismatch error
        }
        console.warn('Could not verify key pair (may be a network issue):', error);
      }

      // Sign transaction client-side
      const { hash, signature } = await signTransaction(
        senderAccountNumber,
        receiverAccountNumber,
        parseFloat(amount),
        privateKeyPem
      );

      // Send transaction with client-side signature
    router.post('/transactions/create', {
      receiver_account_number: beneficiary!.account_number,
      amount: parseFloat(amount),
      note: note || '',
      transaction_pin: transactionPin,
        transaction_hash: hash,
        digital_signature: signature,
    }, {
      onSuccess: () => {
        // Redirect will be handled by backend
        setShowPinModal(false);
        setTransactionPin('');
      },
      onError: (errors) => {
        const errorMessages: { amount?: string; general?: string; pin?: string } = {};
        
        if (errors.error) {
          errorMessages.general = Array.isArray(errors.error) ? errors.error[0] : errors.error;
        } else if (errors.message) {
          errorMessages.general = Array.isArray(errors.message) ? errors.message[0] : errors.message;
        } else if (typeof errors === 'object') {
          // Handle other error formats
          const firstError = Object.values(errors)[0];
          errorMessages.general = Array.isArray(firstError) ? firstError[0] : String(firstError);
        }
        
        // Check if it's a PIN error
        if (errors.transaction_pin) {
          errorMessages.pin = Array.isArray(errors.transaction_pin) ? errors.transaction_pin[0] : errors.transaction_pin;
        }
        
        setErrors(errorMessages);
        setProcessing(false);
      },
      onFinish: () => {
        setProcessing(false);
      },
    });
    } catch (error) {
      console.error('Transaction signing error:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Erreur lors de la signature de la transaction. Veuillez réessayer.' 
      });
      setProcessing(false);
    }
  }, [amount, note, beneficiary, transactionPin, account]);

  const handleAmountClick = useCallback((value: string) => {
    setAmount(value);
  }, []);

  const handleBack = useCallback(() => {
    router.visit('/send');
  }, []);

  if (!beneficiary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Aucun bénéficiaire sélectionné</p>
          <button
            onClick={() => router.visit('/send')}
            className="bg-white border-2 border-[#FF8C00] text-[#FF8C00] px-6 py-2 rounded-full hover:bg-[#FF8C00] hover:text-white transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Envoyer de l'argent</h1>
        </div>
      </header>

      {/* Recipient Info */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-2xl p-6 flex items-center gap-4">
          {beneficiary.avatarUrl ? (
            <img
              src={beneficiary.avatarUrl}
              alt={beneficiary.name}
              className="w-16 h-16 rounded-full object-cover ring-4 ring-[#FF8C00] ring-opacity-20"
            />
          ) : (
            <div className="ring-4 ring-[#FF8C00] ring-opacity-20 rounded-full">
              <DefaultAvatar name={beneficiary.name} size={64} />
            </div>
          )}
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-800">{beneficiary.name}</p>
            <p className="text-sm text-gray-500">{beneficiary.username}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSend}>
        {/* Amount Input */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-8 text-white">
            <p className="text-sm opacity-80 mb-2 text-center">Montant à envoyer</p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                disabled={processing}
                className="bg-transparent text-5xl font-bold text-center text-white placeholder-white placeholder-opacity-50 outline-none w-full"
                style={{ textAlign: 'center' }}
              />
              <span className="text-5xl font-bold">P</span>
            </div>

            {errors.amount && (
              <p className="text-white text-sm mb-4 text-center opacity-90">{errors.amount}</p>
            )}

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['10', '50', '100', '500'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAmountClick(value)}
                  disabled={processing}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-[#FF8C00] py-2 px-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {value}P
                </button>
              ))}
            </div>
            {/* Send Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full bg-white hover:opacity-90 text-[#FF9500] font-bold py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              <span>{processing ? 'Envoi en cours...' : 'Envoyer'}</span>
            </button>

            {errors.general && (
              <p className="text-white text-sm mt-4 text-center opacity-90">{errors.general}</p>
            )}
          </div>
        </div>
      </form>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmer avec votre code PIN</h3>
            <p className="text-sm text-gray-600 mb-6">
              Entrez votre code PIN à 4 chiffres pour confirmer la transaction
            </p>
            
            <div className="mb-6">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={transactionPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setTransactionPin(value);
                  setErrors({});
                }}
                placeholder="••••"
                disabled={processing}
                className="w-full text-center text-3xl font-bold tracking-widest py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent disabled:opacity-50"
                autoFocus
              />
              {errors.pin && (
                <p className="text-red-600 text-sm mt-2 text-center">{errors.pin}</p>
              )}
              {errors.general && (
                <p className="text-red-600 text-sm mt-2 text-center">{errors.general}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setTransactionPin('');
                  setErrors({});
                }}
                disabled={processing}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#FF8C00] font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmWithPin}
                disabled={processing || transactionPin.length !== 4}
                className="flex-1 bg-gradient-to-r from-[#FF9500] via-[#FF8C00] to-[#E07B00] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Confirmation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default SendAmountPage;
