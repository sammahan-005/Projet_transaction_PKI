import { useState, useCallback, FormEventHandler } from 'react';
import { router } from '@inertiajs/react';
import { Mail, Lock, User, Phone, Calendar, Eye, EyeOff } from 'lucide-react';
import logoPO from '../assets/logoPO.jpg';
import { generateKeyPair, storePrivateKeyLocally, getPrivateKeyLocally } from '../lib/crypto';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  phone?: string;
  date_of_birth?: string;
}

interface AuthProps {
  canRegister?: boolean;
  errors?: Record<string, string>;
}

function Auth({ canRegister = true, errors: serverErrors = {} }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerDateOfBirth, setRegisterDateOfBirth] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  };

  const validateRegisterForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!registerName.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!validateEmail(registerEmail)) {
      newErrors.email = 'Email invalide';
    }

    if (!validatePhone(registerPhone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    if (!registerDateOfBirth) {
      newErrors.date_of_birth = 'Date de naissance requise';
    } else {
      const birthDate = new Date(registerDateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13) {
        newErrors.date_of_birth = 'Vous devez avoir au moins 13 ans';
      }
    }

    if (registerPassword.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (registerPassword !== confirmPassword) {
      newErrors.password_confirmation = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLoginForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!validateEmail(loginEmail)) {
      newErrors.email = 'Email invalide';
    }

    if (!loginPassword) {
      newErrors.password = 'Mot de passe requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin: FormEventHandler = (e) => {
    e.preventDefault();

    if (!validateLoginForm()) {
      return;
    }

    setProcessing(true);
    setErrors({});

    router.post('/login', {
      email: loginEmail,
      password: loginPassword,
    }, {
      onFinish: () => setProcessing(false),
      onError: (errors) => {
        setErrors(errors as FormErrors);
        setProcessing(false);
      },
    });
  };

  const handleRegister: FormEventHandler = async (e) => {
    e.preventDefault();

    if (!validateRegisterForm()) {
      return;
    }

    setProcessing(true);
    setErrors({});

    try {
      // Generate key pair client-side (private key never leaves the client)
      const keyPair = await generateKeyPair(2048);
      
      // Store private key locally (unencrypted for now)
      // Will be encrypted with transaction PIN when PIN is set
      // Store unencrypted temporarily for migration to account_number
      if (typeof window !== 'undefined') {
        localStorage.setItem(`private_key_temp_unencrypted_${registerEmail}`, keyPair.privateKeyPem);
      }

      // Send only the public key to the server
      router.post('/register', {
        name: registerName,
        email: registerEmail,
        phone: registerPhone,
        date_of_birth: registerDateOfBirth,
        password: registerPassword,
        password_confirmation: confirmPassword,
        public_key: keyPair.publicKeyPem, // Only public key is sent
      }, {
        onSuccess: async () => {
          // After successful registration, fetch account number and migrate private key
          try {
            // Wait a bit for the account to be created
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Fetch account information to get account number
            const accountResponse = await fetch('/api/account-info');
            if (accountResponse.ok) {
              const data = await accountResponse.json();
              if (data.account_number) {
                // Migrate private key from temp_unencrypted_email to account_number
                const tempKeyUnencrypted = typeof window !== 'undefined' 
                  ? localStorage.getItem(`private_key_temp_unencrypted_${registerEmail}`)
                  : null;
                
                if (tempKeyUnencrypted) {
                  // Store with account number (unencrypted)
                  await storePrivateKeyLocally(data.account_number, tempKeyUnencrypted);
                  // Clean up temp keys
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem(`private_key_temp_unencrypted_${registerEmail}`);
                    localStorage.removeItem(`private_key_temp_${registerEmail}`);
                  }
                  console.log('Private key migrated successfully to account number');
                }
              }
            }
          } catch (error) {
            console.error('Failed to migrate private key during registration:', error);
            // Don't block registration, but log the error
            // The key migration will happen when sending money
          }
          setProcessing(false);
        },
        onFinish: () => {
          setProcessing(false);
        },
        onError: (errors) => {
          setErrors(errors as FormErrors);
          setProcessing(false);
        },
      });
    } catch (error) {
      console.error('Key generation failed:', error);
      setErrors({ 
        password: 'Failed to generate security keys. Please try again.' 
      });
      setProcessing(false);
    }
  };

  // Merge server and client errors
  const allErrors = { ...serverErrors, ...errors };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full blur-2xl opacity-50"></div>
              <img
                src={logoPO}
                alt="Pipocoin Logo"
                className="relative w-32 h-32 rounded-full object-cover ring-4 ring-white"
              />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Pipocoin</h1>
          <p className="text-white text-opacity-90">
            {isLogin ? 'Bon retour parmi nous!' : 'Rejoignez-nous aujourd\'hui'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl p-8">
          {/* Toggle Buttons */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrors({});
              }}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                isLogin
                  ? 'bg-white text-[#FF8C00]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Connexion
            </button>
            {canRegister && (
              <button
                onClick={() => {
                  setIsLogin(false);
                  setErrors({});
                }}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  !isLogin
                    ? 'bg-white text-[#FF8C00]'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Inscription
              </button>
            )}
          </div>

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    disabled={processing}
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all ${
                      allErrors.email
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-transparent focus:border-[#FF8C00] focus:bg-white'
                    }`}
                  />
                </div>
                {allErrors.email && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{allErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={processing}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all ${
                      allErrors.password
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-transparent focus:border-[#FF8C00] focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {allErrors.password && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{allErrors.password}</p>
                )}
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => router.visit('/forgot-password')}
                  className="text-sm text-[#FF8C00] font-semibold hover:underline"
                >
                  Mot de passe oublié?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-[#FF9500] via-[#FF8C00] to-[#E07B00] text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                {processing ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Jean Dupont"
                    disabled={processing}
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all ${
                      allErrors.name
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-transparent focus:border-[#FF8C00] focus:bg-white'
                    }`}
                  />
                </div>
                {allErrors.name && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{allErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    disabled={processing}
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all ${
                      allErrors.email
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-transparent focus:border-[#FF8C00] focus:bg-white'
                    }`}
                  />
                </div>
                {allErrors.email && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{allErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    disabled={processing}
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all ${
                      allErrors.phone
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-transparent focus:border-[#FF8C00] focus:bg-white'
                    }`}
                  />
                </div>
                {allErrors.phone && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{allErrors.phone}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date de naissance
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={registerDateOfBirth}
                    onChange={(e) => setRegisterDateOfBirth(e.target.value)}
                    disabled={processing}
                    className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all ${
                      allErrors.date_of_birth
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-transparent focus:border-[#FF8C00] focus:bg-white'
                    }`}
                  />
                </div>
                {allErrors.date_of_birth && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{allErrors.date_of_birth}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={processing}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all ${
                      allErrors.password
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-transparent focus:border-[#FF8C00] focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {allErrors.password && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{allErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={processing}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 rounded-xl outline-none transition-all ${
                      allErrors.password_confirmation
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-transparent focus:border-[#FF8C00] focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {allErrors.password_confirmation && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{allErrors.password_confirmation}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-gradient-to-r from-[#FF9500] via-[#FF8C00] to-[#E07B00] text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-lg mt-6 disabled:opacity-50"
              >
                {processing ? 'Inscription...' : 'S\'inscrire'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6 opacity-80">
          En continuant, vous acceptez nos conditions d'utilisation
        </p>
      </div>
    </div>
  );
}

export default Auth;
