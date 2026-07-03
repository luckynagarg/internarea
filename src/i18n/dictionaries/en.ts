const dict = {
  navbar: {
    internships: 'Internships',
    jobs: 'Jobs',
    publicSpace: 'Public Space',
    searchPlaceholder: 'Search opportunities...',
    logout: 'Logout',
    continueWithGoogle: 'Continue with Google',
    admin: 'Admin',
  },
  footer: {
    copyright: '© Copyright 2025. All Rights Reserved.',
    getAndroidApp: 'Get Android App',
  },
  pages: {
    subscription: {
      title: 'Subscription & Billing',
      subtitle: 'Manage your plan, payments, and invoices.',
      loading: 'Loading...',
      paymentHistory: 'Payment History',
      invoices: 'Invoices',
      upgradeCta: 'Upgrade to increase monthly applications.',
      noPayments: 'No payments yet.',
      noInvoices: 'No invoices yet.',
    },
    resume: {
      homeTitle: 'Premium Resume',
      homeSubtitle:
        'Create a professional resume by paying ₹50 and verifying via email OTP.',
      createResume: 'Create Resume',
      createTitle: 'Create Resume (Premium)',
      createFee: 'Fee: ₹50 per resume • OTP verification required.',
      sendOtp: 'Send OTP & Continue',
      otpHint: 'Enter OTP sent to your registered email.',
      verifyOtp: 'Verify OTP',
      payTitle: 'OTP verified. Proceed with payment.',
      payCta: 'Pay ₹50 with Razorpay',
      afterPayHint:
        'After successful payment, your resume will be generated and added to profile.',
      doneTitle: 'Resume generated successfully.',
      goToProfile: 'Go to Profile',
    },
  },
} as const;

export default dict;

