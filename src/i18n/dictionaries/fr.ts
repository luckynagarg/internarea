const dict = {
  navbar: {
    internships: 'Stages',
    jobs: 'Emplois',
    friends: 'Amis',
    publicSpace: 'Espace Public',
    searchPlaceholder: 'Rechercher des opportunités...',
    logout: 'Déconnexion',
    continueWithGoogle: 'Continuer avec Google',
    admin: 'Admin',
    language: 'Langue',
  },
  footer: {
    copyright: '© Copyright 2025. Tous droits réservés.',
    getAndroidApp: 'Obtenir l’application Android',
    internshipByPlaces: 'Stages par lieux',
    internshipByStream: 'Stages par filière',
    jobPlaces: 'Emplois par lieux',
    jobsByStreams: 'Emplois par filières',
    aboutUs: 'À propos de nous',
    teamDiary: 'Journal de l’équipe',
    termsAndConditions: 'Conditions générales',
    sitemap: 'Plan du site',
    allRightsReserved: 'Tous droits réservés.',
  },
  pages: {
    subscription: {
      title: 'Abonnement & Facturation',
      subtitle: 'Gérez votre formule, vos paiements et vos factures.',
      loading: 'Chargement...',
      paymentHistory: 'Historique des paiements',
      invoices: 'Factures',
      upgradeCta: 'Passez à un plan pour augmenter les candidatures mensuelles.',
      noPayments: 'Aucun paiement pour le moment.',
      noInvoices: 'Aucune facture pour le moment.',
    },
    resume: {
      homeTitle: 'CV Premium',
      homeSubtitle:
        'Créez un CV professionnel en payant 50 ₹ et en vérifiant via un OTP par email.',
      createResume: 'Créer un CV',
      createTitle: 'Créer un CV (Premium)',
      createFee: 'Tarif : 50 ₹ par CV • Vérification OTP requise.',
      sendOtp: 'Envoyer l’OTP et continuer',
      otpHint: 'Saisissez l’OTP envoyé à votre email enregistré.',
      verifyOtp: 'Vérifier l’OTP',
      payTitle: 'OTP vérifié. Procédez au paiement.',
      payCta: 'Payer 50 ₹ avec Razorpay',
      afterPayHint:
        'Après un paiement réussi, votre CV sera généré et ajouté à votre profil.',
      doneTitle: 'CV généré avec succès.',
      goToProfile: 'Aller au profil',
    },
  },
} as const;

export default dict;

