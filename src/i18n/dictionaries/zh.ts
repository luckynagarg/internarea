const dict = {
  navbar: {
    internships: '实习',
    jobs: '工作',
    publicSpace: '公共空间',
    searchPlaceholder: '搜索机会...',
    logout: '退出登录',
    continueWithGoogle: '使用 Google 继续',
    admin: '管理员',
  },
  footer: {
    copyright: '© 版权所有 2025。保留所有权利。',
    getAndroidApp: '获取 Android 应用',
  },
  pages: {
    subscription: {
      title: '订阅与账单',
      subtitle: '管理你的套餐、付款和发票。',
      loading: '加载中...',
      paymentHistory: '付款记录',
      invoices: '发票',
      upgradeCta: '升级以增加每月申请数量。',
      noPayments: '暂无付款。',
      noInvoices: '暂无发票。',
    },
    resume: {
      homeTitle: 'Premium 简历',
      homeSubtitle:
        '支付 50 ₹ 并通过邮箱 OTP 验证即可创建专业简历。',
      createResume: '创建简历',
      createTitle: '创建简历（Premium）',
      createFee: '费用：每份简历 50 ₹ • 需要 OTP 验证。',
      sendOtp: '发送 OTP 并继续',
      otpHint: '请输入发送到你已注册邮箱的 OTP。',
      verifyOtp: '验证 OTP',
      payTitle: 'OTP 已验证。请继续付款。',
      payCta: '使用 Razorpay 支付 50 ₹',
      afterPayHint: '付款成功后，你的简历将生成并添加到你的个人资料中。',
      doneTitle: '简历生成成功。',
      goToProfile: '进入个人资料',
    },
  },
} as const;

export default dict;

