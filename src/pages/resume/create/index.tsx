import React, { useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/runtime';
import { useSelector } from 'react-redux';
import { selectuser } from '@/Feature/Userslice';
import { useRouter } from 'next/router';
import axiosClient from '@/lib/apiClient';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { toast } from 'react-toastify';
import { Lock, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

/**
 * Payment-first Resume Creation
 * ----------------------------
 * Required flow:
 *   Create Resume -> auth check -> Razorpay payment -> verify -> resume form -> create resume
 *
 * The form is shown ONLY after a successful (server-verified) payment. A paid
 * entitlement is created on the backend (`paid_not_generated` resume doc). The
 * user fills the form, saves it, then generates the PDF.
 */

type Step = 'auth' | 'pay' | 'form' | 'done';

const ResumeCreatePage = () => {
  const { t } = useT();
  const router = useRouter();
  const user = useSelector(selectuser) as any;

  const { edit } = router.query;
  const editId = typeof edit === 'string' ? edit : null;

  const [step, setStep] = useState<Step>('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resumeId, setResumeId] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    qualifications: '',
    experience: '',
    personalInfo: {
      email: user?.email || '',
      phone: '',
      location: '',
      linkedin: '',
      website: '',
    },
  });

  const canProceed = useMemo(() => {
    return !!(form.fullName.trim() && form.qualifications.trim() && form.experience.trim());
  }, [form]);

  useEffect(() => {
    if (editId) {
      loadExisting();
    } else {
      checkAccess();
    }
  }, [editId]);

  async function loadExisting() {
    if (!editId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get(`/api/resume/${editId}`);
      const data = res?.data?.data;
      if (!data) throw new Error('Resume not found.');
      setForm({
        fullName: data.resumeData?.fullName || '',
        qualifications: data.resumeData?.qualifications || '',
        experience: data.resumeData?.experience || '',
        personalInfo: {
          email: data.resumeData?.personalInfo?.email || user?.email || '',
          phone: data.resumeData?.personalInfo?.phone || '',
          location: data.resumeData?.personalInfo?.location || '',
          linkedin: data.resumeData?.personalInfo?.linkedin || '',
          website: data.resumeData?.personalInfo?.website || '',
        },
      });
      setPhotoUrl(data.photoUrl || null);
      setResumeId(String(data._id));
      setStep('form');
    } catch (e: any) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function checkAccess() {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get('/api/resume/create-access');
      const access = res?.data?.data;
      if (access?.allowed) {
        setResumeId(String(access.resumeId || ''));
        setStep('form');
      } else {
        setStep('pay');
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        setStep('auth');
      } else {
        setError(t('common.error'));
        setStep('pay');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    setError(null);
    setLoading(true);
    try {
      const { data } = await axiosClient.post('/api/resume/payment/create-order', {});
      const { orderId, amount, currency, keyId } = data?.data || {};
      if (!orderId) throw new Error('Razorpay orderId missing.');

      await openRazorpayCheckout({
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: amount * 100,
        currency: currency || 'INR',
        order_id: orderId,
        name: 'InternArea',
        description: t('common.premiumResumeCreation'),
        prefill: { name: user?.name || user?.displayName || '', email: user?.email || '' },
        modal: { ondismiss: () => setLoading(false) },
        handler: async (response) => {
          try {
            const verifyRes = await axiosClient.post('/api/resume/payment/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setResumeId(String(verifyRes?.data?.data?.resumeId || ''));
            setStep('form');
            toast.success(t('common.paymentSuccessful'));
          } catch (verifyErr: any) {
            const msg = verifyErr?.response?.data?.error?.message || verifyErr?.response?.data?.message || 'Payment verification failed.';
            setError(msg);
            setStep('pay');
          } finally {
            setLoading(false);
          }
        },
      });
      setLoading(false);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || 'Failed to start checkout.';
      setError(msg);
      setStep('pay');
      setLoading(false);
    }
  }

  async function handleCreateResume() {
    if (!resumeId) return;
    setError(null);
    setLoading(true);
    try {
      const payload = {
        resumeData: {
          fullName: form.fullName,
          qualifications: form.qualifications,
          experience: form.experience,
          personalInfo: { ...form.personalInfo },
        },
        photoUrl,
      };

      if (editId) {
        await axiosClient.patch(`/api/resume/${editId}`, {
          resumeData: payload.resumeData,
          photoUrl,
        });
        toast.success(t('common.resumeUpdated'));
        router.push('/resume');
        return;
      }

      await axiosClient.patch(`/api/resume/${resumeId}/resume-data`, {
        resumeData: payload.resumeData,
        photoUrl,
      });
      await axiosClient.post(`/api/resume/${resumeId}/generate`, {});

      setStep('done');
      toast.success(t('common.resumeGeneratedSuccessfully'));
    } catch (e: any) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  if (loading && step === 'auth') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {editId ? t('resume.editResume') : t('resume.createTitle')}
            </h1>
            <p className="text-gray-600">
              {editId
                ? t('resume.updateResumeDetails')
                : t('resume.createFee')}
            </p>
          </div>

          {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

          {step === 'auth' && (
            <div className="py-8 text-center">
              <Lock className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <div className="font-semibold text-gray-900">{t('common.signinRequired')}</div>
              <p className="text-sm text-gray-600 mt-1 mb-5">
                {t('common.signInToContinue')}
              </p>
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                {t('common.goToLogin')} <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 'pay' && !editId && (
            <div className="py-6 ">
              <div className="border border-gray-200 rounded-xl p-5 mb-5 bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t('common.premiumResumeCreation')}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('common.professionalPdfResume')}
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">₹50</div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handlePay}
                className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t('common.openingRazorpay')}
                  </>
                ) : (
                  <>{t('common.payWithRazorpay')}</>
                )}
              </button>

              <p className="mt-3 text-xs text-gray-500 text-center">
                {t('resume.afterPayHint')}
              </p>
            </div>
          )}

          {step === 'form' && (
            <>
              {!editId && (
                <div className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> {t('common.paymentConfirmed')}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('resume.fullName')}</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">{t('resume.qualifications')}</label>
                  <textarea
                    className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                    rows={3}
                    value={form.qualifications}
                    onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))}
                    placeholder="B.Tech in Computer Science, XYZ University (2021-2025)"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">{t('resume.experience')}</label>
                  <textarea
                    className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                    rows={3}
                    value={form.experience}
                    onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
                    placeholder={'Software Engineer Intern at ABC Corp (2024)\n- Built REST APIs\n- Improved performance by 30%'}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input
                      className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                      value={form.personalInfo.email}
                      onChange={(e) => setForm((p) => ({ ...p, personalInfo: { ...p.personalInfo, email: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('resume.phone')}</label>
                    <input
                      className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                      value={form.personalInfo.phone}
                      onChange={(e) => setForm((p) => ({ ...p, personalInfo: { ...p.personalInfo, phone: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('resume.location')}</label>
                    <input
                      className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                      value={form.personalInfo.location}
                      onChange={(e) => setForm((p) => ({ ...p, personalInfo: { ...p.personalInfo, location: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">LinkedIn</label>
                    <input
                      className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                      value={form.personalInfo.linkedin}
                      onChange={(e) => setForm((p) => ({ ...p, personalInfo: { ...p.personalInfo, linkedin: e.target.value } }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Website / Portfolio</label>
                    <input
                      className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                      value={form.personalInfo.website}
                      onChange={(e) => setForm((p) => ({ ...p, personalInfo: { ...p.personalInfo, website: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  disabled={!canProceed || loading}
                  onClick={handleCreateResume}
                  className="flex-1 bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> {editId ? t('common.loading') : t('common.generating')}
                    </span>
                  ) : editId ? (
                    t('common.save')
                  ) : (
                    t('common.create')
                  )}
                </button>
                {(editId || resumeId) && (
                  <button
                    type="button"
                    onClick={() => router.push('/resume')}
                    className="px-4 py-3 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.backToDashboard')}
                  </button>
                )}
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-10">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-3" />
              <div className="text-lg font-semibold text-gray-900">{t('common.resumeGeneratedSuccessfully')}</div>
              <div className="mt-2 text-sm text-gray-600">{t('common.resumeAvailableInDashboard')}</div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/resume')}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg"
                >
                  {t('resume.goToProfile')}
                </button>
                <button
                  onClick={() => {
                    setStep('auth');
                    checkAccess();
                  }}
                  className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t('common.createAnother')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeCreatePage;
