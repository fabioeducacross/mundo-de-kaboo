import React, { useState } from 'react';
import { Button } from '../design-system';
import { ScreenName, UserProfile, Voucher } from '../types';
import { Icons } from '../components/Icons';
import { LOGO_URL, LEAD_CAPTURE_URL, PENDING_SIGNUP_VOUCHER_STORAGE_KEY, PRIVACY_POLICY_URL, SUPPORT_CONTACT_URL } from '../constants';
import { api } from '../lib/api';
import { getProfileAccessStatus } from '../lib/access';
import { logger } from '../lib/logger';

type LoginStep =
  | 'voucher'
  | 'register'
  | 'login';

const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-2 justify-center py-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all duration-300 ${i + 1 === current
          ? 'w-6 h-2 bg-kaboo-primary'
          : i + 1 < current
            ? 'w-2 h-2 bg-kaboo-primary/40'
            : 'w-2 h-2 bg-gray-200'
          }`}
      />
    ))}
  </div>
);

interface LoginScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onAuthSuccess?: (profile: UserProfile | null) => void | Promise<void>;
}

import backgroundImage from '../assets/images/background-login.jpg';
const BG_IMAGE = backgroundImage;

const savePendingSignupVoucher = (voucherCode: string) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY, voucherCode.trim().toUpperCase());
};

const clearPendingSignupVoucher = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY);
};

const getPendingSignupVoucher = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY) || '';
};

const formatVoucherDurationLabel = (months: number): string => {
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
};

const normalizeAuthError = (message: string): { message: string; requiresEmailConfirmation?: boolean } => {
  if (message === 'Invalid login credentials') {
    return { message: 'E-mail ou senha incorretos.' };
  }

  if (message === 'User already registered') {
    return { message: 'Este e-mail já está cadastrado.' };
  }

  if (message === 'Email not confirmed') {
    return {
      message: 'Confirme seu e-mail para entrar. Verifique sua caixa de entrada e a pasta de spam.',
      requiresEmailConfirmation: true,
    };
  }

  if (/Email address ".+" is invalid/i.test(message)) {
    return { message: 'O e-mail informado é inválido. Use um endereço com domínio existente.' };
  }

  if (message.includes('security purposes') || message.includes('rate limit')) {
    return { message: 'Muitas tentativas. Por segurança, aguarde alguns instantes e tente novamente.' };
  }

  return { message: message || 'Ocorreu um erro. Tente novamente.' };
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate, onAuthSuccess }) => {
  const [step, setStep] = useState<LoginStep>('login');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [voucherValidationMsg, setVoucherValidationMsg] = useState<string | null>(null);
  const [validatedVoucher, setValidatedVoucher] = useState<Voucher | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const clearError = () => {
    if (errorMsg) setErrorMsg(null);
  };

  const clearVoucherValidation = () => {
    setValidatedVoucher(null);
    setVoucherValidationMsg(null);
  };

  const handleVoucherCodeChange = (value: string) => {
    const nextValue = value.toUpperCase().replace(/\s+/g, '');
    setVoucherCode(nextValue);
    clearError();
    if (successMsg) setSuccessMsg(null);
    if (voucherValidationMsg) setVoucherValidationMsg(null);
    if (validatedVoucher && nextValue.trim() !== validatedVoucher.code) {
      setValidatedVoucher(null);
    }
  };

  const handleValidateVoucher = async () => {
    if (loading) return;
    if (!voucherCode.trim()) {
      setErrorMsg('Informe o voucher de acesso para continuar.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setVoucherValidationMsg(null);
    try {
      const result = await api.validateVoucher(voucherCode);
      if (!result.success || !result.voucher) {
        throw new Error(result.message || 'Nao foi possivel validar o voucher informado.');
      }
      setValidatedVoucher(result.voucher);
      setVoucherCode(result.voucher.code);
      setVoucherValidationMsg(`${formatVoucherDurationLabel(result.voucher.duration_months)} de acesso prontos para resgatar`);
    } catch (error: any) {
      setValidatedVoucher(null);
      setVoucherValidationMsg(null);
      setErrorMsg(normalizeAuthError(error?.message || '').message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseAnotherVoucher = () => {
    clearVoucherValidation();
    setVoucherCode('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const goBack = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    switch (step) {
      case 'voucher': setStep('login'); break;
      case 'register': setStep('login'); break;
      default: setStep('login');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (step === 'register') {
        if (!voucherCode.trim()) {
          throw new Error('Informe o codigo de acesso para continuar.');
        }
        if (!acceptedTerms) {
          throw new Error('Você precisa aceitar a política de privacidade para continuar.');
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem. Verifique e tente novamente.');
        }
        const result = await api.registerWithVoucher({
          email,
          password,
          full_name: fullName,
          voucherCode,
        });
        if (!result.success) {
          throw new Error(result.error || 'Nao foi possivel criar sua conta.');
        }
        savePendingSignupVoucher(voucherCode);
        if (result.profile && onAuthSuccess) {
          await onAuthSuccess(result.profile);
        }
        if (result.requiresEmailConfirmation) {
          onNavigate('email_confirmation', {
            status: 'pending',
            email: result.email || email,
            message: result.message,
          });
          return;
        }
        if (!result.requiresLogin) {
          clearPendingSignupVoucher();
          onNavigate('home', { isNewUser: true });
          return;
        }
        setStep('login');
        setVoucherCode('');
        clearVoucherValidation();
        setConfirmPassword('');
        setSuccessMsg(result.message || 'Conta criada com sucesso! Faça login para ativar seu acesso.');

      } else {
        // login
        const result = await api.signIn(email, password);
        if (!result.success) {
          throw new Error(result.error || 'Nao foi possivel iniciar a sessao.');
        }
        let currentProfile = result.profile;
        const pendingVoucher = getPendingSignupVoucher();
        if (pendingVoucher) {
          const pr = await api.redeemVoucher(pendingVoucher);
          if (pr.success && pr.profile) { currentProfile = pr.profile; clearPendingSignupVoucher(); }
        }
        if (currentProfile && onAuthSuccess) await onAuthSuccess(currentProfile);
        if (getProfileAccessStatus(currentProfile) === 'active') clearPendingSignupVoucher();
        onNavigate(getProfileAccessStatus(currentProfile) === 'active' ? 'home' : 'access_expired');
      }
    } catch (error: any) {
      logger.error('Auth error', error);
      const normalizedError = normalizeAuthError(error.message || '');
      if (normalizedError.requiresEmailConfirmation) {
        onNavigate('email_confirmation', { status: 'pending', email, message: normalizedError.message });
        return;
      }
      setErrorMsg(normalizedError.message);
    } finally {
      setLoading(false);
    }
  };

  const isFullScreenMax = step === 'register';

  // Shared error/success feedback
  const FeedbackArea = (
    <>
      {successMsg && (
        <div role="status" aria-live="polite" className="bg-green-50 text-green-600 text-sm p-3 rounded-xl font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
          <Icons.Check size={16} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div role="alert" aria-live="assertive" className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center animate-in fade-in">
          {errorMsg}
        </div>
      )}
    </>
  );

  const PurchaseLink = (
    <div className="text-center">
      <p className="text-xs font-medium text-gray-500">Ainda não tem voucher?</p>
      <a
        href={LEAD_CAPTURE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-kaboo-primary transition-colors hover:text-kaboo-primary/80"
      >
        Entender como funciona e comprar meu acesso{' '}
        <span className="inline-block">→</span>
      </a>
    </div>
  );

  const SupportLink = (
    <div className="text-center">
      <p className="text-xs font-medium text-gray-500">Precisa de ajuda com o voucher?</p>
      <a
        href={SUPPORT_CONTACT_URL}
        className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-gray-600 transition-colors hover:text-kaboo-primary"
      >
        Falar com o suporte{' '}
        <span className="inline-block">→</span>
      </a>
    </div>
  );

  return (
    <div
      className="relative flex h-[100dvh] overflow-hidden bg-gray-50 bg-cover bg-center bg-no-repeat p-0 md:items-center md:justify-center md:p-6 lg:p-8"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    >
      <div className="absolute inset-0 bg-kaboo-primary/20 backdrop-blur-[2px]" />

      <div className={`relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-white transition-all duration-300 md:h-auto md:max-h-[calc(100dvh-3rem)] md:max-w-md md:rounded-3xl md:shadow-2xl lg:max-h-[calc(100dvh-4rem)] ${isFullScreenMax ? 'md:max-w-lg' : ''}`}>

        {/* ─── HEADER: back button + centered logo (voucher/register) ─── */}
        {step !== 'login' && (
          <div className="relative flex shrink-0 items-center justify-center border-b border-gray-100 px-5 py-3">
            <button
              type="button"
              onClick={goBack}
              aria-label="Voltar"
              className="absolute left-4 w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
            >
              <Icons.ChevronLeft size={22} />
            </button>
            <img src={LOGO_URL} alt="Mundo de Kaboo" className="h-12 w-auto object-contain" />
          </div>
        )}

        {/* ─── STEP 1: VOUCHER (validação auxiliar de código) ─── */}
        {step === 'voucher' && (
          <div className="flex flex-col flex-1 px-6 pt-4 pb-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepDots current={1} total={2} />
            <h2 className="text-xl font-bold text-gray-800 mt-3 mb-1">Qual é o seu voucher?</h2>
            <p className="text-sm text-gray-500 mb-5">Use o voucher impresso no seu material de acesso</p>

            <div className="space-y-3">
              <div className="relative">
                <label htmlFor="field-voucher" className="sr-only">Voucher de acesso</label>
                <input
                  id="field-voucher"
                  type="text"
                  value={voucherCode}
                  onChange={(e) => handleVoucherCodeChange(e.target.value)}
                  className={`w-full bg-gray-50 border-2 rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 outline-none transition-all text-base tracking-widest font-mono uppercase ${validatedVoucher
                    ? 'border-green-300 bg-green-50/50 focus:border-green-400'
                    : 'border-gray-100 focus:border-kaboo-primary'
                    }`}
                  placeholder="Ex.: KABOO-3MESES-2026"
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  autoFocus
                  readOnly={!!validatedVoucher}
                />
                <span className="absolute left-4 top-4">
                  {validatedVoucher
                    ? <Icons.Check size={20} className="text-green-500" />
                    : <Icons.Ticket size={20} className="text-gray-400" />
                  }
                </span>
              </div>

              {voucherValidationMsg && validatedVoucher && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 animate-in fade-in duration-200">
                  <Icons.Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{validatedVoucher.code}</p>
                    <p>{voucherValidationMsg}</p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div role="alert" aria-live="assertive" className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium animate-in fade-in">
                  {errorMsg}
                </div>
              )}

              {!validatedVoucher ? (
                <Button
                  type="button"
                  fullWidth
                  onClick={handleValidateVoucher}
                  disabled={loading || !voucherCode.trim()}
                >
                  {loading ? 'Validando...' : 'Validar voucher'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button type="button" fullWidth onClick={() => setStep('register')}>
                    Continuar com cadastro →
                  </Button>
                  <button
                    type="button"
                    onClick={handleUseAnotherVoucher}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
                  >
                    Usar outro voucher
                  </button>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6">
              {SupportLink}
            </div>
          </div>
        )}

        {/* ─── STEP 2A: REGISTER (novo usuário com código) ─── */}
        {step === 'register' && (
          <div className="flex flex-col flex-1 px-6 pt-4 overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Crie sua conta</h2>
            <p className="text-sm text-gray-500">Preencha seus dados e informe o voucher para liberar o acesso.</p>

            <form onSubmit={handleAuth} className="space-y-4 mt-4 pb-8">
              <div className="space-y-2">
                <label htmlFor="field-voucher-register" className="text-sm font-bold text-gray-600 ml-2">Voucher de acesso</label>
                <div className="relative">
                  <input
                    id="field-voucher-register"
                    type="text"
                    value={voucherCode}
                    onChange={(e) => handleVoucherCodeChange(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 outline-none transition-all text-base tracking-widest font-mono uppercase focus:ring-2 focus:ring-kaboo-primary"
                    placeholder="Ex.: KABOO-3MESES-2026"
                    autoComplete="one-time-code"
                    autoCapitalize="characters"
                    autoFocus
                  />
                  <Icons.Ticket className="absolute left-4 top-4 text-gray-400" size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="field-name" className="text-sm font-bold text-gray-600 ml-2">Nome Completo</label>
                <div className="relative">
                  <input
                    id="field-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); clearError(); }}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                    placeholder="Seu nome"
                    required
                    minLength={3}
                    autoComplete="name"
                  />
                  <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="field-email-reg" className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
                <div className="relative">
                  <input
                    id="field-email-reg"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                    placeholder="email@exemplo.com.br"
                    required
                    autoComplete="email"
                  />
                  <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="field-password-reg" className="text-sm font-bold text-gray-600 ml-2">Senha</label>
                <div className="relative">
                  <input
                    id="field-password-reg"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="field-confirm-password" className="text-sm font-bold text-gray-600 ml-2">Confirmar Senha</label>
                <div className="relative">
                  <input
                    id="field-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showConfirmPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 px-2 py-2">
                <div className="relative flex items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => { setAcceptedTerms(e.target.checked); clearError(); }}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-all checked:border-kaboo-primary checked:bg-kaboo-primary focus:ring-2 focus:ring-kaboo-primary/30 outline-none"
                  />
                  <Icons.Check size={14} strokeWidth={4} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none leading-tight">
                  Li e concordo com a{' '}
                  <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-kaboo-primary font-bold hover:underline">
                    política de privacidade
                  </a>{' '}
                  do Mundo de Kaboo.
                </label>
              </div>

              {FeedbackArea}

              <Button type="submit" fullWidth disabled={loading || !acceptedTerms}>
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>

            <div className="pb-8">
              {SupportLink}
            </div>
          </div>
        )}

        {/* ─── DIRECT LOGIN (já tenho conta) ─── */}
        {step === 'login' && (
          <div className="flex min-h-0 flex-col flex-1 overflow-y-auto no-scrollbar px-6 pt-5 pb-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6 flex justify-center pt-1">
              <img src={LOGO_URL} alt="Mundo de Kaboo" className="h-14 w-auto object-contain" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Bem-vindo de volta!</h2>
            <p className="text-sm text-gray-500 mb-5">Entre com seu e-mail e senha para continuar.</p>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="field-email" className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
                <div className="relative">
                  <input
                    id="field-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                    placeholder="email@exemplo.com.br"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                  <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="field-password" className="text-sm font-bold text-gray-600 ml-2">Senha</label>
                <div className="relative">
                  <input
                    id="field-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                  </button>
                </div>
              </div>

              {FeedbackArea}

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => onNavigate('forgot_password')}
                className="text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 py-2 px-3 rounded-lg transition-all duration-200"
              >
                Esqueci minha senha
              </button>
            </div>

            <div className="mt-auto space-y-4 pt-8">
              <div className="rounded-3xl border border-kaboo-primary/15 bg-gradient-to-br from-kaboo-primary/[0.08] via-white to-white p-4 text-left shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-kaboo-primary shadow-sm ring-1 ring-kaboo-primary/10">
                    <Icons.Ticket size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary/70">Primeiro acesso</p>
                    <p className="mt-1 text-base font-bold text-gray-800">Ainda não tem cadastro?</p>
                    <p className="mt-1 text-sm leading-5 text-gray-600">Insira seu voucher de acesso para criar sua conta e liberar a plataforma.</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    clearError();
                    setSuccessMsg(null);
                    setStep('register');
                  }}
                  className="mt-4"
                >
                  Inserir voucher de acesso
                </Button>
              </div>

              {PurchaseLink}
            </div>
          </div>
        )}



      </div>
    </div>
  );
};

