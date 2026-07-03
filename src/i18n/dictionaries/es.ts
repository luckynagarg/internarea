const dict = {
  navbar: {
    internships: 'Pasantías',
    jobs: 'Empleos',
    publicSpace: 'Espacio público',
    searchPlaceholder: 'Buscar oportunidades...',
    logout: 'Cerrar sesión',
    continueWithGoogle: 'Continuar con Google',
    admin: 'Admin',
  },
  footer: {
    copyright: '© Copyright 2025. Todos los derechos reservados.',
    getAndroidApp: 'Obtener la app de Android',
  },
  pages: {
    subscription: {
      title: 'Suscripción y Facturación',
      subtitle: 'Administra tu plan, pagos y facturas.',
      loading: 'Cargando...',
      paymentHistory: 'Historial de pagos',
      invoices: 'Facturas',
      upgradeCta: 'Actualiza para aumentar las solicitudes mensuales.',
      noPayments: 'Aún no hay pagos.',
      noInvoices: 'Aún no hay facturas.',
    },
    resume: {
      homeTitle: 'CV Premium',
      homeSubtitle:
        'Crea un CV profesional pagando 50 ₹ y verificando con un OTP por correo electrónico.',
      createResume: 'Crear CV',
      createTitle: 'Crear CV (Premium)',
      createFee: 'Tarifa: 50 ₹ por CV • Se requiere verificación OTP.',
      sendOtp: 'Enviar OTP y continuar',
      otpHint: 'Ingresa el OTP enviado a tu correo registrado.',
      verifyOtp: 'Verificar OTP',
      payTitle: 'OTP verificado. Continúa con el pago.',
      payCta: 'Pagar 50 ₹ con Razorpay',
      afterPayHint:
        'Después del pago exitoso, tu CV se generará y se añadirá a tu perfil.',
      doneTitle: 'CV generado correctamente.',
      goToProfile: 'Ir al perfil',
    },
  },
} as const;

export default dict;

