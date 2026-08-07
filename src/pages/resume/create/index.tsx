import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectuser } from '@/Feature/Userslice';
import { useRouter } from 'next/router';
import axiosClient from '@/lib/apiClient';
import { toast } from 'react-toastify';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

const ResumeCreatePage = () => {
  const router = useRouter();
  const user = useSelector(selectuser) as any;

  // Edit mode: ?edit=<resumeId>
  const { edit } = router.query;
  const editId = typeof edit === 'string' ? edit : null;

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

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'otp' | 'pay' | 'done'>('form');
  const [testMode, setTestMode] = useState(true); // Test bypass ON by default for easy testing

  const [resumeId, setResumeId] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing resume for edit mode.
  useEffect(() => {
    if (!editId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await axiosClient.get(`/api/resume/${editId}`);
        const data = res?.data?.data;
        if (!data || !mounted) return;
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
        if (mounted) setError(e?.response?.data?.error?.message || e?.message || 'Failed to load resume.');
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const canProceed = useMemo(() => {
    return !!form.fullName && !!form.qualifications && !!form.experience && !!form.personalInfo;
  }, [form]);

  function buildResumePayload() {
    return {
      resumeData: {
        fullName: form.fullName,
        qualifications: form.qualifications,
        experience: form.experience,
        personalInfo: { ...form.personalInfo },
      },
      photoUrl,
    };
  }

  // Save/update the resume (works in both normal and test mode via PATCH for edit).
  async function handleSaveDraft() {
    if (editId) {
      setError(null);
      setLoading(true);
      try {
        await axiosClient.patch(`/api/resume/${editId}`, { resumeData: buildResumePayload().resumeData, photoUrl });
        toast.success('Resume saved.');
      } catch (e: any) {
        setError(e?.response?.data?.error?.message || e?.message || 'Failed to save resume.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // New resume in test mode: instantly generate (no OTP, no payment).
    if (testMode) {
      setError(null);
      setLoading(true);
      try {
        const res = await axiosClient.post(`/api/resume/test/generate`, buildResumePayload());
        const data = res?.data?.data;
        setResumeId(String(data?._id || ''));
        setStep('done');
        toast.success('Resume generated (test mode).');
      } catch (e: any) {
        setError(e?.response?.data?.error?.message || e?.message || 'Failed to generate resume.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Normal mode: start the OTP purchase flow.
    await handleSendOtp();
  }

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      // Test bypass header skips premium check + OTP on backend.
      if (testMode) headers['x-resume-test-bypass'] = 'true';

      const res = await axiosClient.post(
        `/api/resume/purchase/start`,
        buildResumePayload(),
        { headers }
      );

      setResumeId(res.data?.data?.resumeId);
      setOtpExpiresAt(res.data?.data?.otpExpiresAt);
      // In test mode backend auto-verifies OTP -> skip straight to pay step.
      setStep(testMode ? 'pay' : 'otp');
      if (testMode) toast.info('OTP auto-verified (test mode).');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error?.message || e?.message || 'Failed to start purchase');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setLoading(true);
    try {
      await axiosClient.post(`/api/resume/purchase/otp/verify`, {
        resumeId,
        otp,
      });
      setStep('pay');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error?.message || e?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipPayment() {
    // TEST MODE: simulate successful Razorpay verification -> generate resume PDF.
    setError(null);
    setLoading(true);
    try {
      await axiosClient.post(`/api/resume/test/verify-payment`, { resumeId });
      setStep('done');
      toast.success('Payment simulated (test mode). Resume generated.');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePayment() {
    setError(null);
    setLoading(true);
    try {
      const res = await axiosClient.post(`/api/resume/purchase/razorpay/create-order`, {
        resumeId,
      });

      const { orderId } = res.data?.data || {};
      if (!orderId) throw new Error('Razorpay orderId missing');

      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: '5000',
        currency: 'INR',
        order_id: orderId,
        name: 'InternArea',
        description: 'Premium Resume Creation',
        handler: async (response: any) => {
          try {
            await axiosClient.post(`/api/resume/purchase/razorpay/verify`, {
              resumeId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setStep('done');
            toast.success('Resume generated successfully.');
          } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
        prefill: { name: user?.name || '', email: user?.email || '' },
      });

      rzp.open();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create Razorpay order');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {editId ? 'Edit Resume' : 'Create Resume (Premium)'}
              </h1>
              <p className="text-gray-600 mb-2">
                {editId ? 'Update your resume details.' : 'Fee: ₹50 per resume • OTP verification required.'}
              </p>
            </div>

            {/* Test mode toggle */}
            {!editId && (
              <button
                type="button"
                onClick={() => setTestMode((t) => !t)}
                className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  testMode
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${testMode ? 'bg-amber-500' : 'bg-gray-400'}`} />
                {testMode ? 'Test Mode: ON' : 'Test Mode: OFF'}
              </button>
            )}
          </div>

          {testMode && !editId && (
            <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <strong>Test mode active.</strong> Resume will be created and PDF generated instantly — no OTP email, no
              Razorpay payment, no premium plan required.
            </div>
          )}

          {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700">{error}</div>}

          {step === 'form' && (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Qualifications</label>
                  <textarea
                    className="mt-1 w-full border rounded px-3 py-2"
                    rows={3}
                    value={form.qualifications}
                    onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))}
                    placeholder="B.Tech in Computer Science, XYZ University (2021-2025)"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Experience</label>
                  <textarea
                    className="mt-1 w-full border rounded px-3 py-2"
                    rows={3}
                    value={form.experience}
                    onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
                    placeholder="Software Engineer Intern at ABC Corp (2024)\n- Built REST APIs\n- Improved performance by 30%"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Location</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={form.personalInfo.location}
                    onChange={(e) => setForm((p) => ({ ...p, personalInfo: { ...p.personalInfo, location: e.target.value } }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={form.personalInfo.phone}
                    onChange={(e) => setForm((p) => ({ ...p, personalInfo: { ...p.personalInfo, phone: e.target.value } }))}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  disabled={!canProceed || loading}
                  onClick={handleSaveDraft}
                  className={`flex-1 text-white font-medium py-3 rounded disabled:opacity-50 ${
                    testMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading
                    ? 'Processing...'
                    : editId
                      ? 'Save Resume'
                      : testMode
                        ? 'Generate Resume (Test Mode)'
                        : 'Send OTP & Continue'}
                </button>
                {editId && (
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

          {step === 'otp' && (
            <>
              <div className="text-gray-700 mb-3">Enter OTP sent to your registered email.</div>
              <input
                className="border w-full rounded px-3 py-2"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
              />
              <button
                disabled={loading}
                onClick={handleVerifyOtp}
                className="mt-4 w-full bg-green-600 text-white font-medium py-3 rounded disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              {otpExpiresAt && <div className="mt-2 text-xs text-gray-500">OTP expires: {new Date(otpExpiresAt).toLocaleString()}</div>}
            </>
          )}

          {step === 'pay' && (
            <>
              <div className="text-gray-700 mb-4">OTP verified. Proceed with payment.</div>

              {testMode ? (
                <button
                  disabled={loading}
                  onClick={handleSkipPayment}
                  className="w-full bg-amber-600 text-white font-medium py-3 rounded disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Skip Payment & Generate (Test Mode)'}
                </button>
              ) : (
                <button
                  disabled={loading}
                  onClick={handleGeneratePayment}
                  className="w-full bg-purple-600 text-white font-medium py-3 rounded disabled:opacity-50"
                >
                  {loading ? 'Opening Razorpay...' : 'Pay ₹50 with Razorpay'}
                </button>
              )}

              <div className="mt-3 text-xs text-gray-500">
                After successful payment, your resume will be generated and added to profile.
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-10">
              <div className="text-green-700 font-semibold text-lg">Resume generated successfully.</div>
              <div className="mt-2 text-sm text-gray-600">Your resume is available in the dashboard.</div>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/resume')}
                  className="px-5 py-2 bg-blue-600 text-white rounded"
                >
                  Go to My Resumes
                </button>
                <button
                  onClick={() => {
                    setStep('form');
                    setForm({ fullName: '', qualifications: '', experience: '', personalInfo: { email: user?.email || '', phone: '', location: '', linkedin: '', website: '' } });
                  }}
                  className="px-5 py-2 border rounded text-gray-700 hover:bg-gray-50"
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

