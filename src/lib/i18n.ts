import { ref, computed } from 'vue';

export type SupportedLocale = 'es' | 'en';

export interface Translations {
  header: {
    title: string;
    subtitle: string;
    guestMode: string;
    guestTooltip: string;
    cloudSynced: string;
    signIn: string;
    signUp: string;
    signOut: string;
    language: string;
    driverProfile: string;
    syncPending: string;
    themeToggle: string;
    themeLight: string;
    themeDark: string;
  };
  bannerLocal: {
    title: string;
    badge: string;
    description: string;
    button: string;
  };
  footer: {
    brandDesc: string;
    allSystemsOperational: string;
    quickLinks: string;
    newPassenger: string;
    paymentHistory: string;
    securityTitle: string;
    securityEncrypted: string;
    storageMode: string;
    rightsReserved: string;
    version: string;
    mobileReady: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    totalPassengers: string;
    upToDate: string;
    pending: string;
    overdue: string;
    monthlyRevenue: string;
    overdueAlert: string;
    filterAll: string;
    filterUpToDate: string;
    filterPending: string;
    filterOverdue: string;
    filterPaused: string;
  };
  actions: {
    newPassenger: string;
    paymentHistory: string;
    searchPlaceholder: string;
    filterTurnoAll: string;
    filterTurnoMorning: string;
    filterTurnoAfternoon: string;
    filterTurnoBoth: string;
    filterDayAll: string;
    reload: string;
    noResultsSearch: string;
    noPassengersGuest: string;
    noPassengersCloud: string;
    createFirstPassenger: string;
  };
  card: {
    active: string;
    paused: string;
    payAndRenew: string;
    paid: string;
    pendingPayment: string;
    overdueBy: string;
    dueToday: string;
    dueIn: string;
    upToDateBadge: string;
    daysLeft: string;
    cutoffDate: string;
    monthlyFee: string;
    frequencyMonthly: string;
    frequencyBiweekly: string;
    frequencyWeekly: string;
    call: string;
    whatsapp: string;
    stops: string;
    weeklySchedule: string;
    viewReceipts: string;
    edit: string;
    pause: string;
    activate: string;
    delete: string;
    confirmDelete: string;
    localBadge: string;
  };
  modalPassenger: {
    createTitle: string;
    editTitle: string;
    name: string;
    namePlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    address: string;
    addressPlaceholder: string;
    monthlyRate: string;
    frequency: string;
    frequencyWeekly: string;
    frequencyBiweekly: string;
    frequencyMonthly: string;
    cutoffDate: string;
    serviceShift: string;
    shiftMorning: string;
    shiftAfternoon: string;
    shiftBoth: string;
    weeklyDays: string;
    stopsPerDay: string;
    copyDay: string;
    copied: string;
    pasteDay: string;
    pasteAll: string;
    invertedReturn: string;
    invertStops: string;
    save: string;
    cancel: string;
    saving: string;
  };
  modalAuth: {
    loginTab: string;
    registerTab: string;
    loginTitle: string;
    loginSubtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    submitLogin: string;
    submitRegister: string;
    loading: string;
    continueAsGuest: string;
    guestExplanation: string;
    migrationNoticeTitle: string;
    migrationNoticeDesc: string;
    migrateYes: string;
    migrateNo: string;
  };
  history: {
    title: string;
    subtitle: string;
    totalCollected: string;
    totalReceipts: string;
    lastPayment: string;
    noPayments: string;
    close: string;
  };
  days: {
    lun: string;
    mar: string;
    mie: string;
    jue: string;
    vie: string;
    sab: string;
    dom: string;
    lunes: string;
    martes: string;
    miercoles: string;
    jueves: string;
    viernes: string;
    sabado: string;
    domingo: string;
  };
}

export const dictionaries: Record<SupportedLocale, Translations> = {
  es: {
    header: {
      title: 'Transport',
      subtitle: 'Control de Pasajeros & Cobranzas',
      guestMode: 'Modo Local',
      guestTooltip: 'Datos guardados en este dispositivo',
      cloudSynced: 'Nube Sincronizada',
      signIn: 'Iniciar Sesión',
      signUp: 'Registrarse',
      signOut: 'Cerrar Sesión',
      language: 'Idioma',
      driverProfile: 'Perfil de Conductor',
      syncPending: 'pasajeros locales listos para sincronizar',
      themeToggle: 'Alternar tema de interfaz',
      themeLight: 'Modo Claro',
      themeDark: 'Modo Oscuro'
    },
    bannerLocal: {
      title: 'Estás en Modo Local (Almacenamiento en este equipo)',
      badge: 'Modo Local',
      description: 'Los pasajeros y rutas se guardan en tu navegador/dispositivo. Inicia sesión para respaldar en la nube y acceder desde cualquier lugar.',
      button: 'Iniciar Sesión / Respaldar'
    },
    footer: {
      brandDesc: 'Plataforma integral para gestión de flotas, pasajeros y control de cobranzas periódicas.',
      allSystemsOperational: 'Todos los sistemas operativos',
      quickLinks: 'Accesos Rápidos',
      newPassenger: 'Nuevo Pasajero',
      paymentHistory: 'Historial de Cobros',
      securityTitle: 'Seguridad & Datos',
      securityEncrypted: 'Sesiones y claves protegidas con WebCrypto (PBKDF2)',
      storageMode: 'Almacenamiento',
      rightsReserved: 'Todos los derechos reservados.',
      version: 'Edición Profesional',
      mobileReady: 'Optimizado para Web y Móvil (Capacitor)'
    },
    dashboard: {
      title: 'Gestión de Transporte & Pasajeros',
      subtitle: 'Supervisa el estado de cobro, itinerarios semanales y rutas activas en tiempo real.',
      totalPassengers: 'Total Pasajeros',
      upToDate: 'Al Día',
      pending: 'Por Vencer / Pendientes',
      overdue: 'Vencidos',
      monthlyRevenue: 'Recaudación Mensual',
      overdueAlert: 'pasajeros requieren cobro urgente',
      filterAll: 'Todos',
      filterUpToDate: 'Al Día',
      filterPending: 'Pendientes',
      filterOverdue: 'Vencidos',
      filterPaused: 'Pausados'
    },
    actions: {
      newPassenger: 'Nuevo Pasajero',
      paymentHistory: 'Historial de Cobros',
      searchPlaceholder: 'Buscar por nombre, teléfono o dirección...',
      filterTurnoAll: 'Todos los turnos',
      filterTurnoMorning: '🌅 Turno Mañana',
      filterTurnoAfternoon: '🌇 Turno Tarde',
      filterTurnoBoth: '🔄 Ambos Turnos',
      filterDayAll: 'Todos los días',
      reload: 'Recargar',
      noResultsSearch: 'No hay resultados que coincidan con la búsqueda.',
      noPassengersGuest: 'Aún no has registrado pasajeros en este equipo. Puedes crearlos libremente en modo local o iniciar sesión para sincronizar tu cuenta en la nube.',
      noPassengersCloud: 'Aún no tienes pasajeros registrados en tu cuenta de la nube.',
      createFirstPassenger: 'Crear Primer Pasajero'
    },
    card: {
      active: 'Activo',
      paused: 'Pausado',
      payAndRenew: 'Cobrar y Renovar',
      paid: 'Pagado',
      pendingPayment: 'Marcar Pagado',
      overdueBy: 'Venció hace {days}d',
      dueToday: '¡Vence hoy!',
      dueIn: 'Vence en {days}d',
      upToDateBadge: 'Al día',
      daysLeft: 'faltan {days}d',
      cutoffDate: 'Corte',
      monthlyFee: 'Tarifa',
      frequencyMonthly: 'mensual',
      frequencyBiweekly: 'quincenal',
      frequencyWeekly: 'semanal',
      call: 'Llamar',
      whatsapp: 'WhatsApp',
      stops: 'Paradas',
      weeklySchedule: 'Itinerario Semanal',
      viewReceipts: 'Ver recibos',
      edit: 'Editar',
      pause: 'Pausar',
      activate: 'Activar',
      delete: 'Eliminar',
      confirmDelete: '¿Estás seguro de que deseas eliminar este pasajero? Esta acción no se puede deshacer.',
      localBadge: 'Modo Local'
    },
    modalPassenger: {
      createTitle: 'Registrar Nuevo Pasajero',
      editTitle: 'Editar Pasajero',
      name: 'Nombre Completo',
      namePlaceholder: 'Ej. Juan Pérez',
      phone: 'Teléfono / WhatsApp',
      phonePlaceholder: 'Ej. 04141234567 o +58...',
      address: 'Dirección Principal / Referencia',
      addressPlaceholder: 'Dirección o punto de referencia',
      monthlyRate: 'Monto de la Tarifa ($)',
      frequency: 'Frecuencia de Cobro',
      frequencyWeekly: 'Semanal',
      frequencyBiweekly: 'Quincenal',
      frequencyMonthly: 'Mensual',
      cutoffDate: 'Fecha de Corte / Inicio de Ciclo',
      serviceShift: 'Turno de Servicio',
      shiftMorning: '🌅 Mañana',
      shiftAfternoon: '🌇 Tarde',
      shiftBoth: '🔄 Ambos',
      weeklyDays: 'Días de Servicio',
      stopsPerDay: 'Itinerario y Paradas por Día',
      copyDay: 'Copiar día',
      copied: '¡Copiado!',
      pasteDay: 'Pegar en',
      pasteAll: 'A todos',
      invertedReturn: '+ Regreso invertido',
      invertStops: 'Invertir',
      save: 'Guardar Pasajero',
      cancel: 'Cancelar',
      saving: 'Guardando...'
    },
    modalAuth: {
      loginTab: 'Iniciar Sesión',
      registerTab: 'Crear Cuenta',
      loginTitle: 'Bienvenido de nuevo',
      loginSubtitle: 'Accede a tus pasajeros y rutas sincronizadas en la nube.',
      registerTitle: 'Crear Cuenta de Conductor',
      registerSubtitle: 'Gestiona tus pasajeros de manera privada y sincronizada.',
      fullName: 'Nombre Completo',
      fullNamePlaceholder: 'Ej. Carlos Méndez',
      email: 'Correo Electrónico',
      emailPlaceholder: 'tucorreo@ejemplo.com',
      password: 'Contraseña',
      passwordPlaceholder: 'Mínimo 6 caracteres',
      submitLogin: 'Entrar a mi Cuenta',
      submitRegister: 'Registrarme y Respaldar',
      loading: 'Procesando...',
      continueAsGuest: 'Continuar sin cuenta (Modo Local)',
      guestExplanation: 'Los datos se guardarán únicamente en la memoria de este navegador o teléfono.',
      migrationNoticeTitle: '¿Sincronizar datos locales a la nube?',
      migrationNoticeDesc: 'Tienes {count} pasajero(s) guardados en este equipo. ¿Deseas subirlos ahora a tu cuenta de la nube?',
      migrateYes: 'Sí, sincronizar a la nube',
      migrateNo: 'No por ahora'
    },
    history: {
      title: 'Historial de Cobros y Recibos',
      subtitle: 'Registro detallado de todos los pagos cobrados a pasajeros.',
      totalCollected: 'Total Cobrado',
      totalReceipts: 'Cobros Realizados',
      lastPayment: 'Último Pago',
      noPayments: 'Aún no hay cobros registrados en el historial.',
      close: 'Cerrar'
    },
    days: {
      lun: 'Lun',
      mar: 'Mar',
      mie: 'Mie',
      jue: 'Jue',
      vie: 'Vie',
      sab: 'Sab',
      dom: 'Dom',
      lunes: 'Lunes',
      martes: 'Martes',
      miercoles: 'Miércoles',
      jueves: 'Jueves',
      viernes: 'Viernes',
      sabado: 'Sábado',
      domingo: 'Domingo'
    }
  },
  en: {
    header: {
      title: 'Transport',
      subtitle: 'Passenger & Payment Management',
      guestMode: 'Local Mode',
      guestTooltip: 'Data saved on this device',
      cloudSynced: 'Cloud Synced',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      language: 'Language',
      driverProfile: 'Driver Profile',
      syncPending: 'local passengers ready to sync',
      themeToggle: 'Toggle interface theme',
      themeLight: 'Light Mode',
      themeDark: 'Dark Mode'
    },
    bannerLocal: {
      title: 'You are in Local Mode (Saved on this device)',
      badge: 'Local Mode',
      description: 'Passengers and routes are stored only on this browser/device. Sign in to back them up to the cloud and access from anywhere.',
      button: 'Sign In / Cloud Backup'
    },
    footer: {
      brandDesc: 'Comprehensive platform for fleet, passenger management and periodic billing control.',
      allSystemsOperational: 'All systems operational',
      quickLinks: 'Quick Tools',
      newPassenger: 'New Passenger',
      paymentHistory: 'Payment History',
      securityTitle: 'Security & Data',
      securityEncrypted: 'Sessions & keys protected with WebCrypto (PBKDF2)',
      storageMode: 'Storage Mode',
      rightsReserved: 'All rights reserved.',
      version: 'Professional Edition',
      mobileReady: 'Optimized for Web & Mobile (Capacitor)'
    },
    dashboard: {
      title: 'Transport & Passenger Management',
      subtitle: 'Monitor payment statuses, weekly itineraries, and active routes in real-time.',
      totalPassengers: 'Total Passengers',
      upToDate: 'Up to Date',
      pending: 'Upcoming / Pending',
      overdue: 'Overdue',
      monthlyRevenue: 'Monthly Revenue',
      overdueAlert: 'passengers require urgent collection',
      filterAll: 'All',
      filterUpToDate: 'Up to Date',
      filterPending: 'Pending',
      filterOverdue: 'Overdue',
      filterPaused: 'Paused'
    },
    actions: {
      newPassenger: 'New Passenger',
      paymentHistory: 'Payment History',
      searchPlaceholder: 'Search by name, phone or address...',
      filterTurnoAll: 'All shifts',
      filterTurnoMorning: '🌅 Morning Shift',
      filterTurnoAfternoon: '🌇 Afternoon Shift',
      filterTurnoBoth: '🔄 Both Shifts',
      filterDayAll: 'All days',
      reload: 'Reload',
      noResultsSearch: 'No results match your search criteria.',
      noPassengersGuest: 'No passengers registered on this device yet. You can create them freely in local mode or sign in to sync with your cloud account.',
      noPassengersCloud: 'No passengers registered in your cloud account yet.',
      createFirstPassenger: 'Create First Passenger'
    },
    card: {
      active: 'Active',
      paused: 'Paused',
      payAndRenew: 'Charge & Renew',
      paid: 'Paid',
      pendingPayment: 'Mark as Paid',
      overdueBy: 'Overdue by {days}d',
      dueToday: 'Due today!',
      dueIn: 'Due in {days}d',
      upToDateBadge: 'Up to date',
      daysLeft: '{days}d left',
      cutoffDate: 'Due',
      monthlyFee: 'Fare',
      frequencyMonthly: 'monthly',
      frequencyBiweekly: 'bi-weekly',
      frequencyWeekly: 'weekly',
      call: 'Call',
      whatsapp: 'WhatsApp',
      stops: 'Stops',
      weeklySchedule: 'Weekly Schedule',
      viewReceipts: 'View receipts',
      edit: 'Edit',
      pause: 'Pause',
      activate: 'Activate',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this passenger? This action cannot be undone.',
      localBadge: 'Local Mode'
    },
    modalPassenger: {
      createTitle: 'Register New Passenger',
      editTitle: 'Edit Passenger',
      name: 'Full Name',
      namePlaceholder: 'e.g. John Doe',
      phone: 'Phone / WhatsApp',
      phonePlaceholder: 'e.g. +1 555 123 4567...',
      address: 'Main Address / Landmark',
      addressPlaceholder: 'Address or landmark description',
      monthlyRate: 'Fare Amount ($)',
      frequency: 'Billing Frequency',
      frequencyWeekly: 'Weekly',
      frequencyBiweekly: 'Bi-weekly',
      frequencyMonthly: 'Monthly',
      cutoffDate: 'Due Date / Cycle Start',
      serviceShift: 'Service Shift',
      shiftMorning: '🌅 Morning',
      shiftAfternoon: '🌇 Afternoon',
      shiftBoth: '🔄 Both',
      weeklyDays: 'Service Days',
      stopsPerDay: 'Itinerary & Stops per Day',
      copyDay: 'Copy day',
      copied: 'Copied!',
      pasteDay: 'Paste to',
      pasteAll: 'To all',
      invertedReturn: '+ Reverse return',
      invertStops: 'Reverse',
      save: 'Save Passenger',
      cancel: 'Cancel',
      saving: 'Saving...'
    },
    modalAuth: {
      loginTab: 'Sign In',
      registerTab: 'Create Account',
      loginTitle: 'Welcome Back',
      loginSubtitle: 'Access your cloud-synced passengers and routes.',
      registerTitle: 'Create Driver Account',
      registerSubtitle: 'Manage your passengers privately and securely in the cloud.',
      fullName: 'Full Name',
      fullNamePlaceholder: 'e.g. Carlos Mendez',
      email: 'Email Address',
      emailPlaceholder: 'youremail@example.com',
      password: 'Password',
      passwordPlaceholder: 'Minimum 6 characters',
      submitLogin: 'Sign In to My Account',
      submitRegister: 'Sign Up & Cloud Backup',
      loading: 'Processing...',
      continueAsGuest: 'Continue as Guest (Local Mode)',
      guestExplanation: 'Data will be saved solely inside this browser or phone memory.',
      migrationNoticeTitle: 'Sync local data to cloud?',
      migrationNoticeDesc: 'You have {count} passenger(s) saved on this device. Would you like to upload them to your cloud account now?',
      migrateYes: 'Yes, sync to cloud',
      migrateNo: 'Not now'
    },
    history: {
      title: 'Payment & Receipt History',
      subtitle: 'Detailed record of all collected passenger payments.',
      totalCollected: 'Total Collected',
      totalReceipts: 'Payments Count',
      lastPayment: 'Last Payment',
      noPayments: 'No payment history recorded yet.',
      close: 'Close'
    },
    days: {
      lun: 'Mon',
      mar: 'Tue',
      mie: 'Wed',
      jue: 'Thu',
      vie: 'Fri',
      sab: 'Sat',
      dom: 'Sun',
      lunes: 'Monday',
      martes: 'Tuesday',
      miercoles: 'Wednesday',
      jueves: 'Thursday',
      viernes: 'Friday',
      sabado: 'Saturday',
      domingo: 'Sunday'
    }
  }
};

// Global reactive locale
const currentLocale = ref<SupportedLocale>('es');

// Initialize from localStorage or browser settings if on client
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('tm_lang') as SupportedLocale;
  if (saved === 'es' || saved === 'en') {
    currentLocale.value = saved;
  } else if (navigator.language && navigator.language.toLowerCase().startsWith('en')) {
    currentLocale.value = 'en';
  }
}

export function useI18n() {
  const locale = computed(() => currentLocale.value);
  const t = computed(() => dictionaries[currentLocale.value]);

  function setLocale(newLocale: SupportedLocale) {
    currentLocale.value = newLocale;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tm_lang', newLocale);
      document.documentElement.lang = newLocale;
    }
  }

  function toggleLocale() {
    setLocale(currentLocale.value === 'es' ? 'en' : 'es');
  }

  return {
    locale,
    t,
    setLocale,
    toggleLocale
  };
}
