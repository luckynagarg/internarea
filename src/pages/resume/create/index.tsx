import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { selectuser } from '@/Feature/Userslice';
import { useRouter } from 'next/router';

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE;

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
    return !!form.fullName && !!form.qualifications && !!form.experience;
  }, [form]);

  const getToken = async () => {
    return await user?.getIdToken?.();
  };

  async function handleSendOtp() {
    setError(null);
    setLoading(true);

    try {
      const token = await getToken();

      const res = await axios.post(
        `${BACKEND_BASE}/api/resume/purchase/start`,
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
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      const token = await getToken();

      await axios.post(
        `${BACKEND_BASE}/api/resume/purchase/otp/verify`,
        { resumeId, otp },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStep('pay');
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
      const token = await getToken();

      const res = await axios.post(
        `${BACKEND_BASE}/api/resume/purchase/razorpay/create-order`,
        { resumeId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
            const token = await getToken();

            await axios.post(
              `${BACKEND_BASE}/api/resume/purchase/razorpay/verify`,
              {
                resumeId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            setStep('done');
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

          <h1 className="text-2xl font-bold mb-2">Create Resume (Premium)</h1>
          <p className="text-gray-600 mb-6">₹50 fee • OTP required</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
              {error}
            </div>
          )}

          {step === 'form' && (
            <>
              <input
                placeholder="Full Name"
                className="border p-2 w-full mb-2"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />

              <textarea
                placeholder="Qualifications"
                className="border p-2 w-full mb-2"
                value={form.qualifications}
                onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
              />

              <textarea
                placeholder="Experience"
                className="border p-2 w-full mb-2"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
              />

              <button
                disabled={!canProceed || loading}
                onClick={handleSendOtp}
                className="bg-blue-600 text-white w-full py-2"
              >
                {loading ? 'Loading...' : 'Send OTP'}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <input
                placeholder="Enter OTP"
                className="border p-2 w-full mb-2"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />

              <button
                onClick={handleVerifyOtp}
                className="bg-green-600 text-white w-full py-2"
              >
                Verify OTP
              </button>
            </>
          )}

          {step === 'pay' && (
            <button
              onClick={handleGeneratePayment}
              className="bg-purple-600 text-white w-full py-2"
            >
              Pay ₹50
            </button>
          )}

          {step === 'done' && (
            <div className="text-green-600 font-bold text-center">
              Resume Created Successfully 🎉
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeCreatePage;