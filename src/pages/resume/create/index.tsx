import React, { useEffect, useMemo, useState } from 'react';
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
  const router = useRouter();
  const user = useSelector(selectuser) as any;

  // Edit mode: ?edit=<resumeId> (existing resume dashboard feature, kept intact)
  const { edit } = router.query;
  const editId = typeof edit === 'string' ? edit : null;

  const [step, setStep] = useState<Step>('auth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paid resume entitlement (created after payment). null until paid.
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

  // On mount: if in edit mode load the existing resume; otherwise check access.
  useEffect(() => {
    if (editId) {
      loadExisting();
    } else {
      checkAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to load resume.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Payment-first guard: determine whether the user has paid for a resume
   * entitlement already. If not authenticated -> 'auth' step; if no entitlement
   * -> 'pay' step; if already entitled -> 'form' step.
   */
  async function checkAccess() {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get('/api/resume/create-access');
      const access = res?.data?.data;
      if (access?.allowed) {
        setResumeId(String(access.resumeId || ''));
        // User already paid — go straight to the form.
        setStep('form');
      } else {
        setStep('pay');
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        // Not signed in.
        setStep('auth');
      } else {
        // Backend error — fall through to payment screen, surface error.
        setError(e?.response?.data?.error?.message || e?.message || 'Could not check resume access.');
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
      // 1. Create Razorpay order on the backend (no form data required).
      const { data } = await axiosClient.post('/api/resume/payment/create-order', {});
      const { orderId, amount, currency, keyId } = data?.data || {};
      if (!orderId) throw new Error('Razorpay orderId missing.');

      // 2. Open Razorpay checkout.
      await openRazorpayCheckout({
        key: keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: amount * 100,
        currency: currency || 'INR',
        order_id: orderId,
        name: 'InternArea',
        description: 'Premium Resume Creation',
        prefill: { name: user?.name || user?.displayName || '', email: user?.email || '' },
        modal: { ondismiss: () => setLoading(false) },
        handler: async (response) => {
          try {
            // 3. Verify signature on the backend -> creates paid entitlement.
            const verifyRes = await axiosClient.post('/api/resume/payment/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setResumeId(String(verifyRes?.data?.data?.resumeId || ''));
            setStep('form');
            toast.success('Payment successful. Now fill in your resume details.');
          } catch (verifyErr: any) {
            const msg = verifyErr?.response?.data?.error?.message || verifyErr?.response?.data?.message || 'Payment verification failed.';
            setError(msg);
            setStep('pay');
          } finally {
            setLoading(false);
          }
        },
      });
      // Note: keep loading until modal handler/ondismiss resolves.
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
        toast.success('Resume updated.');
        router.push('/resume');
        return;
      }

      // Payment-first flow: save the form into the paid entitlement, then generate.
      await axiosClient.patch(`/api/resume/${resumeId}/resume-data`, {
        resumeData: payload.resumeData,
        photoUrl,
      });
      await axiosClient.post(`/api/resume/${resumeId}/generate`, {});

      setStep('done');
      toast.success('Resume generated successfully.');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to create resume.');
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
              {editId ? 'Edit Resume' : 'Create Premium Resume'}
            </h1>
            <p className="text-gray-600">
              {editId
                ? 'Update your resume details.'
                : 'Pay once (₹50) and create a professional resume. Payment is required before the form.'}
            </p>
          </div>

          {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

          {/* AUTH REQUIRED */}
          {step === 'auth' && (
            <div className="py-8 text-center">
              <Lock className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <div className="font-semibold text-gray-900">Sign in required</div>
              <p className="text-sm text-gray-600 mt-1 mb-5">
                Please sign in to create a premium resume.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Go to Login <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* PAYMENT FIRST */}
          {step === 'pay' && !editId && (
            <div className="py-6 ">
              <div className="border border-gray-200 rounded-xl p-5 mb-5 bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Premium Resume Creation</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Professional PDF resume • Added to your dashboard
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening Razorpay...
                  </>
                ) : (
                  <>Pay ₹50 with Razorpay</>
                )}
              </button>

              <p className="mt-3 text-xs text-gray-500 text-center">
                You must complete payment to access the resume form. No charge if cancelled.
              </p>
            </div>
          )}

          {/* RESUME FORM (only after payment in non-edit mode) */}
          {step === 'form' && (
            <>
              {!editId && (
                <div className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Payment confirmed. Now add your details.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Qualifications</label>
                  <textarea
                    className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                    rows={3}
                    value={form.qualifications}
                    onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))}
                    placeholder="B.Tech in Computer Science, XYZ University (2021-2025)"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Experience</label>
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
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <input
                      className="mt-1 w-full border rounded px-3 py-2 text-gray-900"
                      value={form.personalInfo.phone}
                      onChange={(e) => setForm((p) => ({ ...p, personalInfo: { ...p.personalInfo, phone: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
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
                      <Loader2 className="h-4 w-4 animate-spin" /> {editId ? 'Saving...' : 'Generating Resume...'}
                    </span>
                  ) : editId ? (
                    'Save Resume'
                  ) : (
                    'Create Resume'
                  )}
                </button>
                {(editId || resumeId) && (
                  <button
                    type="button"
                    onClick={() => router.push('/resume')}
                    className="px-4 py-3 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Back to Dashboard
                  </button>
                )}
              </div>
            </>
          )}

          {/* DONE */}
          {step === 'done' && (
            <div className="text-center py-10">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-3" />
              <div className="text-lg font-semibold text-gray-900">Resume generated successfully.</div>
              <div className="mt-2 text-sm text-gray-600">Your resume is available in the dashboard.</div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/resume')}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Go to My Resumes
                </button>
                <button
                  onClick={() => {
                    // Allow creating another (will require another payment via fresh access check).
                    setStep('auth');
                    checkAccess();
                  }}
                  className="px-5 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Create Another
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

