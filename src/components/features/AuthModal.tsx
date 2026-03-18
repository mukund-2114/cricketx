import { useState } from 'react';
import { X, Eye, EyeOff, Trophy, Mail, Lock, User as UserIcon, Phone } from 'lucide-react';
import { toast } from 'sonner';
import type { Currency } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  onClose: () => void;
}

type AuthStep = 'login' | 'register';

export default function AuthModal({ onClose }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('login');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');

  // Register state
  const [regEmail, setRegEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCurrency, setRegCurrency] = useState<Currency>('CAD');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPw, setRegConfirmPw] = useState('');
  const [agreed, setAgreed] = useState(false);

  // ─── Login ───────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use target values directly to avoid stale state from password managers
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value || loginEmail;
    const pw = (form.elements.namedItem('password') as HTMLInputElement)?.value || loginPw;

    if (!email || !pw) { 
      toast.error('Fill in all fields'); 
      return; 
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: email, 
        password: pw 
      });
      
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'Incorrect email or password' : error.message);
      } else {
        toast.success('Welcome back!');
        onClose();
      }
    } catch (err) {
      console.error('[Auth] Login exception:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Register ────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('regName') as HTMLInputElement)?.value || regName;
    const email = (form.elements.namedItem('regEmail') as HTMLInputElement)?.value || regEmail;
    const phone = (form.elements.namedItem('regPhone') as HTMLInputElement)?.value || regPhone;
    const password = (form.elements.namedItem('regPassword') as HTMLInputElement)?.value || regPassword;
    const confirm = (form.elements.namedItem('regConfirmPw') as HTMLInputElement)?.value || regConfirmPw;

    if (!name || !email || !phone || !password) { toast.error('Fill in all fields'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!agreed) { toast.error('Please agree to the terms'); return; }

    setLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('auth-signup', {
        body: { email, password, name, phone, currency: regCurrency },
      });

      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);

      // Sign in immediately
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      toast.success('Account created! 1,000 bonus points added.');
      onClose();
    } catch (err: any) {
      console.error('[Auth] Registration error:', err);
      toast.error(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[hsl(222,35%,14%)] border border-[hsl(222,30%,22%)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:border-[hsl(var(--brand-gold))] transition-colors";

  const pwStrength = [regPassword.length >= 8, /[A-Z]/.test(regPassword), /\d/.test(regPassword)];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md card-glass rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative navy-gradient px-6 pt-6 pb-4">
          <button onClick={onClose} className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center">
              <Trophy size={16} className="text-[hsl(var(--brand-navy))]" />
            </div>
            <span className="font-bold text-lg text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              CRICKET<span className="text-[hsl(var(--brand-gold))]">X</span>
            </span>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-0 bg-[hsl(222,35%,14%)] rounded-lg p-1">
            <button onClick={() => setStep('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                step === 'login' ? 'gold-gradient text-[hsl(var(--brand-navy))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}>
              Sign In
            </button>
            <button onClick={() => setStep('register')}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                step === 'register' ? 'gold-gradient text-[hsl(var(--brand-navy))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}>
              Join Now
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* ── Login ── */}
          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                  <input type="email" name="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                    placeholder="you@example.com" className={`${inputClass} pl-9`} autoFocus />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                  <input type={showPw ? 'text' : 'password'} name="password" value={loginPw} onChange={e => setLoginPw(e.target.value)}
                    placeholder="••••••••" className={`${inputClass} pl-9 pr-10`} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-white">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full gold-gradient text-[hsl(var(--brand-navy))] font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => setStep('register')} className="text-[hsl(var(--brand-gold))] hover:underline font-medium">
                  Create one free →
                </button>
              </p>
            </form>
          )}

          {/* ── Register ── */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="bg-[hsl(142,40%,10%)] border border-[hsl(142,40%,20%)] rounded-lg px-3 py-2.5 flex items-start gap-2">
                <span className="text-base flex-shrink-0">🎁</span>
                <div>
                  <p className="text-xs font-bold text-[hsl(142,60%,65%)]">Welcome Bonus: 1,000 Points</p>
                  <p className="text-xs text-[hsl(142,50%,50%)] mt-0.5">≈ CA$10 credited instantly on signup</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input name="regName" value={regName} onChange={e => setRegName(e.target.value)} placeholder="John Doe"
                      className={`${inputClass} pl-8`} autoFocus />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Phone</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input name="regPhone" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+1 xxx xxxx"
                      className={`${inputClass} pl-8`} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                  <input type="email" name="regEmail" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    placeholder="you@example.com" className={`${inputClass} pl-8`} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Preferred Currency</label>
                <select value={regCurrency} onChange={e => setRegCurrency(e.target.value as Currency)} className={inputClass}>
                  <option value="CAD">🇨🇦 CAD — 1 CAD = 100 pts</option>
                  <option value="USD">🇺🇸 USD — 1 USD = 100 pts</option>
                  <option value="INR">🇮🇳 INR — 1 INR = 1.25 pts</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Password</label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                    <input type={showPw ? 'text' : 'password'} name="regPassword" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                      placeholder="Min 8 chars" className={`${inputClass} pl-8 pr-8`} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-white">
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Confirm</label>
                  <div className="relative">
                    <input type={showConfirmPw ? 'text' : 'password'} name="regConfirmPw" value={regConfirmPw} onChange={e => setRegConfirmPw(e.target.value)}
                      placeholder="Repeat" className={`${inputClass} pr-8`} />
                    <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-white">
                      {showConfirmPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>

              {regPassword && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {pwStrength.map((ok, i) => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${ok ? 'bg-[hsl(142,76%,45%)]' : 'bg-[hsl(222,30%,22%)]'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {pwStrength.filter(Boolean).length === 3 ? '✓ Strong password' : 'Needs: 8+ chars, uppercase, number'}
                  </p>
                </div>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 accent-[hsl(var(--brand-gold))]" />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  I confirm I am 18+ and agree to the{' '}
                  <span className="text-[hsl(var(--brand-gold))] underline cursor-pointer">Terms & Conditions</span>.
                  This site is operated from Canada.
                </span>
              </label>

              <button type="submit" disabled={loading}
                className="w-full gold-gradient text-[hsl(var(--brand-navy))] font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                {loading ? 'Creating account...' : 'Create My Account 🎉'}
              </button>

              <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
                Already have an account?{' '}
                <button type="button" onClick={() => setStep('login')} className="text-[hsl(var(--brand-gold))] hover:underline font-medium">
                  Sign In
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
