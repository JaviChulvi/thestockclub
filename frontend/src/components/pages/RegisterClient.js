'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { Link as IntlLink } from '@/i18n/navigation';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const t = useTranslations('auth.register');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('message.passwordMismatch'));
      setLoading(false);
      return;
    }

    // Password validation - frontend check before API call
    if (formData.password.length < 10) {
      setError(t('message.passwordShort'));
      setLoading(false);
      return;
    }
    
    // Check password complexity
    const hasUppercase = /[A-Z]/.test(formData.password);
    const hasLowercase = /[a-z]/.test(formData.password);
    const hasNumber = /\d/.test(formData.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setError(t('message.passwordWeak'));
      setLoading(false);
      return;
    }

    try {
      const { API_BASE_URL } = await import('@/config/api');
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('message.registrationFailed'));
      }

      if (data.success) {
        // Use AuthContext to handle login after registration
        login(data.sessionToken, data.user);
        
        setSuccess(true);

        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(data.error || t('message.registrationFailed'));
      }

    } catch (err) {
      console.error('Registration error:', err);
      setError(t('message.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // TODO: Implement Google OAuth registration
      console.log('Google registration initiated');

      // Simulate redirect to Google OAuth
      window.location.href = '/api/auth/google';
    } catch (err) {
      setError(t('message.error'));
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    console.log(e.target.value);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#fff1e0] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white border-4 border-gray-800 shadow-2xl p-12">
            <div className="text-6xl mb-6">✓</div>
            <h1 className="text-3xl font-bold serif text-gray-900 mb-4">
              {t('success.title')}
            </h1>
            <p className="text-gray-700 font-serif mb-6">
              {t('success.message')}
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff1e0]">

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white border-4 border-gray-800 shadow-2xl">
          {/* Header */}
          <div className="bg-black text-[#fff1e0] px-6 py-4 border-b-2 border-gray-600">
            <h1 className="text-3xl font-bold serif text-center tracking-wide">
              {t('title')}
            </h1>
            <p className="text-center mt-2 text-lg opacity-90">
              {t('subtitle')}
            </p>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Registration Form */}
              <div className="flex-1 space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                        {t('label.firstName')}
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 bg-[#f8f6f0] border-2 border-gray-400 rounded-none focus:outline-none focus:border-gray-800 focus:bg-white transition-all duration-200 text-gray-900 font-serif text-sm"
                        placeholder="John"
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                        {t('label.lastName')}
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 bg-[#f8f6f0] border-2 border-gray-400 rounded-none focus:outline-none focus:border-gray-800 focus:bg-white transition-all duration-200 text-gray-900 font-serif text-sm"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                      {t('label.email')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-[#f8f6f0] border-2 border-gray-400 rounded-none focus:outline-none focus:border-gray-800 focus:bg-white transition-all duration-200 text-gray-900 font-serif text-sm"
                      placeholder="john.doe@domain.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                      {t('label.password')}
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-[#f8f6f0] border-2 border-gray-400 rounded-none focus:outline-none focus:border-gray-800 focus:bg-white transition-all duration-200 text-gray-900 font-serif text-sm"
                      placeholder={t('placeholder.password')}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wide">
                      {t('label.confirmPassword')}
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-[#f8f6f0] border-2 border-gray-400 rounded-none focus:outline-none focus:border-gray-800 focus:bg-white transition-all duration-200 text-gray-900 font-serif text-sm"
                      placeholder={t('placeholder.confirmPassword')}
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border-2 border-red-400 text-red-800 px-3 py-2 rounded-none text-sm font-serif">
                      <strong>{t('message.error')}</strong> {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-[#fff1e0] px-6 py-3 font-bold uppercase text-sm tracking-wide hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 border-2 border-black"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#fff1e0] mr-2"></div>
                        {t('button.creating')}
                      </div>
                    ) : (
                      t('button.submit')
                    )}
                  </button>

                  <div className="text-center">
                    <Link
                      href="/login"
                      className="text-gray-700 hover:text-black underline text-xs font-serif"
                    >
                      {t('link.haveAccount')}
                    </Link>
                  </div>
                </form>
              </div>

              {/* Divider - positioned between form and benefits */}
              <div className="hidden md:block w-px bg-gray-400 self-stretch mx-4"></div>

              {/* Benefits Section */}
              <div className="flex-1 space-y-4">
                {/* Why Choose The Stock Club Benefits - prominently displayed */}
                <div className="bg-[#f8f6f0] border-2 border-gray-400 p-6">
                  <h3 className="text-lg font-bold serif text-gray-900 mb-4 text-center uppercase tracking-wide">
                    {t('benefits.title')}
                  </h3>
                  <ul className="space-y-3 text-sm font-serif text-gray-800">
                    <li className="flex items-start">
                      <span className="text-black mr-2">•</span>
                      <span>{t('benefits.item1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-black mr-2">•</span>
                      <span>{t('benefits.item2')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-black mr-2">•</span>
                      <span>{t('benefits.item3')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-black mr-2">•</span>
                      <span>{t('benefits.item4')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-black mr-2">•</span>
                      <span>{t('benefits.item5')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t-2 border-gray-400 text-center">
              <p className="text-gray-600 text-sm font-serif">
                {t('footer')}{' '}
                <Link href="/terms" className="underline hover:text-black">
                  {t('terms')}
                </Link>{' '}
                {t('and')}{' '}
                <Link href="/privacy" className="underline hover:text-black">
                  {t('privacy')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
