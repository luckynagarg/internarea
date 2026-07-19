import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectuser } from '@/Feature/Userslice';
import { useRouter } from 'next/router';
import axiosClient from '@/lib/apiClient';



const ResumeCreatePage = () => {
  const router = useRouter();
  const user = useSelector(selectuser) as any;

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

  const [resumeId, setResumeId] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canProceed = useMemo(() => {
    return !!form.fullName && !!form.qualifications && !!form.experience && !!form.personalInfo;
  }, [form]);

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      // TODO: Integrate with auth token if your frontend uses Firebase ID token.
      // Existing pages likely already attach Authorization header from Userslice middleware.
      const res = await axiosClient.post(
        `/api/resume/purchase/start`,

        {
          resumeData: {
            fullName: form.fullName,
            qualifications: form.qualifications,
            experience: form.experience,
            personalInfo: {
              ...form.personalInfo,
            },
          },
          photoUrl,
        }
      );

      setResumeId(res.data?.data?.resumeId);
      setOtpExpiresAt(res.data?.data?.otpExpiresAt);
      setStep('otp');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to start purchase');
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

      // Razorpay checkout is client-side. For simplicity, we only redirect to subscription page.
      // If you already have Razorpay scripts in subscription page, replicate the same logic.
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'OTP verification failed');
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

      // Start Razorpay payment using returned orderId.
      // We assume Razorpay checkout script is available globally as `window.Razorpay`.
      const { orderId } = res.data?.data || {};
      if (!orderId) throw new Error('Razorpay orderId missing');

      const rzp = new (window as any).Razorpay({
        // Must use ONLY NEXT_PUBLIC_RAZORPAY_KEY_ID on the frontend.
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: '5000', // amount in paise for ₹50; replace if backend returns amount
        currency: 'INR',
        order_id: orderId,

        name: 'InternArea',
        description: 'Premium Resume Creation',
        handler: async (response: any) => {
          try {
            const verifyRes = await axiosClient.post(`/api/resume/purchase/razorpay/verify`, {

              resumeId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            setStep('done');
            // After done you can route to profile.
            router.push('/profile');
          } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Resume (Premium)</h1>
          <p className="text-gray-600 mb-6">Fee: ₹50 per resume • OTP verification required.</p>

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
                    value={form.qualifications}
                    onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Experience</label>
                  <textarea
                    className="mt-1 w-full border rounded px-3 py-2"
                    value={form.experience}
                    onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
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

              <button
                disabled={!canProceed || loading}
                onClick={handleSendOtp}
                className="mt-6 w-full bg-blue-600 text-white font-medium py-3 rounded disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Send OTP & Continue'}
              </button>
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
              <button
                disabled={loading}
                onClick={handleGeneratePayment}
                className="w-full bg-purple-600 text-white font-medium py-3 rounded disabled:opacity-50"
              >
                {loading ? 'Opening Razorpay...' : 'Pay ₹50 with Razorpay'}
              </button>
              <div className="mt-3 text-xs text-gray-500">After successful payment, your resume will be generated and added to profile.</div>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-10">
              <div className="text-green-700 font-semibold text-lg">Resume generated successfully.</div>
              <button
                onClick={() => router.push('/profile')}
                className="mt-4 px-5 py-2 bg-blue-600 text-white rounded"
              >
                Go to Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeCreatePage;

