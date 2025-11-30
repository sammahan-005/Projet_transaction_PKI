import { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { getPrivateKeyLocally, storePrivateKeyLocally } from '../lib/crypto';
import { ArrowLeft, Camera, ChevronRight, LogOut, Bell, Lock, HelpCircle, Info, Edit2, Save, X } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import DefaultAvatar from '../components/DefaultAvatar';

/**
 * Interface pour les informations du compte
 */
interface Account {
  id: number;
  account_number: string;
  balance: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Interface pour les informations de l'utilisateur
 */
interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  profile_picture?: string | null;
  created_at: string;
}

/**
 * Props de la page Profile
 */
interface ProfileProps {
  /** Informations de l'utilisateur connecté */
  user: User;
  /** Informations du compte (optionnel) */
  account?: Account;
}

/**
 * Page de profil utilisateur
 * 
 * Cette page permet à l'utilisateur de :
 * - Voir et modifier son profil (nom, photo)
 * - Voir les informations de son compte (numéro, solde, date de création)
 * - Modifier son code PIN de transaction
 * - Gérer les paramètres (notifications)
 * - Se déconnecter
 * 
 * Fonctionnalités :
 * - Édition du nom avec sauvegarde
 * - Upload de photo de profil (base64)
 * - Modification du PIN avec vérification de l'ancien PIN
 * - Formatage des dates en français
 * - Formatage du numéro de compte pour l'affichage
 * 
 * @param props Les props de la page
 * @returns Le composant React de la page de profil
 */
function Profile({ user, account }: ProfileProps) {
  // État pour l'activation des notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // État pour l'édition du nom
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  
  // État pour la photo de profil (stockée en base64)
  const [profilePicture, setProfilePicture] = useState<string | null>(user.profile_picture || null);
  
  // État pour l'upload en cours
  const [isUploading, setIsUploading] = useState(false);
  
  // Référence vers l'input fichier pour déclencher le sélecteur de fichier
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // État pour l'édition du PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinErrors, setPinErrors] = useState<{current?: string; new?: string; confirm?: string; general?: string}>({});

  /**
   * Gère la déconnexion de l'utilisateur
   * 
   * Demande confirmation avant de déconnecter l'utilisateur.
   */
  const handleLogout = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      router.post('/logout');
    }
  };

  /**
   * Formate une date en français
   * 
   * Format : "15 décembre 2024"
   * 
   * @param dateString La date à formater (format ISO)
   * @returns La date formatée en français
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    });
  };

  /**
   * Formate une date de naissance en français
   * 
   * @param dateString La date de naissance à formater (format ISO, optionnel)
   * @returns La date formatée en français ou null si non fournie
   */
  const formatDateOfBirth = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric',
      month: 'long', 
      year: 'numeric' 
    });
  };

  /**
   * Formate un numéro de compte pour l'affichage
   * 
   * Ajoute des espaces tous les 4 caractères pour améliorer la lisibilité.
   * Exemple : "PC327788184620093795" -> "PC 3277 8818 4620 0937 95"
   * 
   * @param accountNumber Le numéro de compte à formater
   * @returns Le numéro de compte formaté ou "N/A" si non fourni
   */
  const formatAccountNumber = (accountNumber?: string) => {
    if (!accountNumber) return 'N/A';
    // Format: PC327788184620093795 -> PC 3277 8818 4620 0937 95
    return accountNumber.match(/.{1,4}/g)?.join(' ') || accountNumber;
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      alert('Le nom ne peut pas être vide');
      return;
    }

    setIsUploading(true);
    router.post('/profile/update', {
      name: editedName.trim(),
      profile_picture: profilePicture || '',
    }, {
      onSuccess: () => {
        setIsEditingName(false);
        setIsUploading(false);
        // Reload page to get updated user data
        router.reload({ only: ['user'] });
      },
      onError: () => {
        setIsUploading(false);
      },
      preserveScroll: true,
    });
  };

  const handleCancelEdit = () => {
    setEditedName(user.name);
    setProfilePicture(user.profile_picture || null);
    setIsEditingName(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('L\'image est trop grande. Taille maximum: 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfilePicture(base64String);
      setIsEditingName(true); // Enable edit mode to show save button
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePicture = () => {
    setProfilePicture(null);
    setIsEditingName(true); // Enable edit mode to show save button
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdatePin = async () => {
    // Clear previous errors
    setPinErrors({});

    // Validate new PIN
    if (!newPin || newPin.length !== 4) {
      setPinErrors({ new: 'Le code PIN doit contenir 4 chiffres' });
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setPinErrors({ new: 'Le code PIN doit contenir uniquement des chiffres' });
      return;
    }

    if (newPin !== confirmPin) {
      setPinErrors({ confirm: 'Les codes PIN ne correspondent pas' });
      return;
    }

    setIsUpdatingPin(true);

    router.post('/profile/update-pin', {
      current_pin: currentPin || '',
      new_pin: newPin,
      new_pin_confirmation: confirmPin,
    }, {
      onSuccess: async () => {
        // After PIN is set/updated, encrypt private key with new PIN
        try {
          if (account?.account_number) {
            // Get user email for temp key lookup
            const userEmail = user.email;
            
            // Try to find unencrypted key
            let privateKey: string | null = null;
            
            // Check if key exists with account number (unencrypted)
            privateKey = await getPrivateKeyLocally(account.account_number);
            
            // If not found, check temp keys
            if (!privateKey && typeof window !== 'undefined') {
              const tempKey = localStorage.getItem(`private_key_temp_unencrypted_${userEmail}`);
              if (tempKey && tempKey.includes('BEGIN PRIVATE KEY')) {
                privateKey = tempKey;
              }
            }
            
            // If we found a key, encrypt it with the new PIN
            if (privateKey) {
              await storePrivateKeyLocally(account.account_number, privateKey, newPin);
              console.log('Private key encrypted with new transaction PIN');
            }
          }
        } catch (error) {
          console.error('Failed to encrypt private key with PIN:', error);
          // Don't block PIN update if key encryption fails
        }
        
        setShowPinModal(false);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setPinErrors({});
        setIsUpdatingPin(false);
        alert('Code PIN mis à jour avec succès!');
      },
      onError: (errors) => {
        const errorMessages: {current?: string; new?: string; confirm?: string; general?: string} = {};
        
        if (errors.current_pin) {
          errorMessages.current = Array.isArray(errors.current_pin) ? errors.current_pin[0] : errors.current_pin;
        }
        if (errors.new_pin) {
          errorMessages.new = Array.isArray(errors.new_pin) ? errors.new_pin[0] : errors.new_pin;
        }
        if (errors.new_pin_confirmation) {
          errorMessages.confirm = Array.isArray(errors.new_pin_confirmation) ? errors.new_pin_confirmation[0] : errors.new_pin_confirmation;
        }
        if (errors.error || errors.message) {
          errorMessages.general = Array.isArray(errors.error || errors.message) ? (errors.error || errors.message)[0] : (errors.error || errors.message);
        }
        
        setPinErrors(errorMessages);
        setIsUpdatingPin(false);
      },
    });
  };

  const hasUnsavedChanges = () => {
    return isEditingName || profilePicture !== (user.profile_picture || null) || editedName !== user.name;
  };

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
          <h1 className="text-xl font-bold text-gray-800">Profil</h1>
        </div>
      </header>

      {/* Profile Info */}
      <div className="px-6 py-8">
        <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-white"
                />
              ) : (
                <div className="ring-4 ring-white rounded-full">
                  <DefaultAvatar name={editedName} size={80} />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Camera className="w-4 h-4 text-[#FF8C00]" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {profilePicture && (
                <button
                  onClick={handleRemovePicture}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                  title="Supprimer la photo"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex-1">
              {hasUnsavedChanges() ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold bg-white bg-opacity-20 text-white px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-white"
                    autoFocus={isEditingName}
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={isUploading || !editedName.trim()}
                    className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Enregistrer"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isUploading}
                    className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Annuler"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{editedName || 'Utilisateur'}</h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="w-7 h-7 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
                    title="Modifier le nom"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
              <p className="text-sm opacity-90">{user.email}</p>
              {user.phone && (
                <p className="text-sm opacity-90 mt-1">📱 {user.phone}</p>
              )}
              {user.date_of_birth && (
                <p className="text-xs opacity-75 mt-1">
                  🎂 {formatDateOfBirth(user.date_of_birth)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div>
              <p className="text-sm opacity-80 mb-1">Numéro de compte</p>
              <p className="font-semibold text-xs break-all">
                {account ? formatAccountNumber(account.account_number) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">Membre depuis</p>
              <p className="font-semibold text-sm">{formatDate(user.created_at)}</p>
            </div>
          </div>

          {account ? (
            <>
              <div className="mt-4 pt-4">
                <p className="text-sm opacity-80 mb-1">Solde actuel</p>
                <p className="text-3xl font-bold">P {Number(account.balance).toLocaleString('fr-FR', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}</p>
              </div>
              {account.created_at && (
                <div className="mt-3 pt-3 border-t border-white border-opacity-20">
                  <p className="text-xs opacity-70">Compte créé le {formatDate(account.created_at)}</p>
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 pt-4 border-t border-white border-opacity-20">
              <p className="text-sm opacity-80 mb-1">Aucun compte trouvé</p>
              <p className="text-xs opacity-70">Veuillez contacter le support</p>
            </div>
          )}
        </div>
      </div>

      {/* Account Settings */}
      <div className="px-6 pb-6">
        <h3 className="text-sm font-bold text-gray-600 mb-3 px-2">Compte</h3>
        <div className="bg-white rounded-2xl overflow-hidden">
          <button
            onClick={() => router.visit('/qrcode')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#FF8C00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Mon code QR</p>
                <p className="text-xs text-gray-500">Afficher et partager</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => setShowPinModal(true)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#FF8C00]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Code PIN de transaction</p>
                <p className="text-xs text-gray-500">Modifier votre code PIN</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#FF8C00]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Notifications</p>
                <p className="text-xs text-gray-500">Gérer les alertes</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF8C00]"></div>
            </label>
          </button>
        </div>
      </div>

      {/* Support */}
      <div className="px-6 pb-6">
        <h3 className="text-sm font-bold text-gray-600 mb-3 px-2">Support</h3>
        <div className="bg-white rounded-2xl overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-[#FF8C00]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Centre d'aide</p>
                <p className="text-xs text-gray-500">FAQ et support</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                <Info className="w-5 h-5 text-[#FF8C00]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">À propos</p>
                <p className="text-xs text-gray-500">Version 1.0.0</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-6 pb-6">
        <button
          onClick={handleLogout}
          className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3"
        >
          <LogOut className="w-5 h-5" />
          <span>Se déconnecter</span>
        </button>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Modifier le code PIN</h3>
            <p className="text-sm text-gray-600 mb-6">
              Le code PIN est utilisé pour confirmer vos transactions. Il doit contenir 4 chiffres.
            </p>
            
            {pinErrors.general && (
              <div className="mb-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">{pinErrors.general}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Current PIN (only if user has one) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Code PIN actuel (laisser vide si nouveau compte)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setCurrentPin(value);
                    setPinErrors({ ...pinErrors, current: undefined });
                  }}
                  placeholder="••••"
                  disabled={isUpdatingPin}
                  className={`w-full text-center text-2xl font-bold tracking-widest py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent disabled:opacity-50 ${
                    pinErrors.current ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {pinErrors.current && (
                  <p className="text-red-600 text-xs mt-1">{pinErrors.current}</p>
                )}
              </div>

              {/* New PIN */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nouveau code PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setNewPin(value);
                    setPinErrors({ ...pinErrors, new: undefined });
                  }}
                  placeholder="••••"
                  disabled={isUpdatingPin}
                  className={`w-full text-center text-2xl font-bold tracking-widest py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent disabled:opacity-50 ${
                    pinErrors.new ? 'border-red-300' : 'border-gray-300'
                  }`}
                  autoFocus={!currentPin}
                />
                {pinErrors.new && (
                  <p className="text-red-600 text-xs mt-1">{pinErrors.new}</p>
                )}
              </div>

              {/* Confirm PIN */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmer le nouveau code PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setConfirmPin(value);
                    setPinErrors({ ...pinErrors, confirm: undefined });
                  }}
                  placeholder="••••"
                  disabled={isUpdatingPin}
                  className={`w-full text-center text-2xl font-bold tracking-widest py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent disabled:opacity-50 ${
                    pinErrors.confirm ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {pinErrors.confirm && (
                  <p className="text-red-600 text-xs mt-1">{pinErrors.confirm}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setCurrentPin('');
                  setNewPin('');
                  setConfirmPin('');
                  setPinErrors({});
                }}
                disabled={isUpdatingPin}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdatePin}
                disabled={isUpdatingPin || newPin.length !== 4 || confirmPin.length !== 4}
                className="flex-1 bg-gradient-to-r from-[#FF9500] via-[#FF8C00] to-[#E07B00] hover:opacity-90 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPin ? 'Mise à jour...' : 'Mettre à jour'}
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

export default Profile;
