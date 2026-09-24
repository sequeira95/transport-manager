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
    openInGoogleMaps: string;
    navigateStop: string;
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
    forgotPasswordLink: string;
    forgotPasswordTitle: string;
    forgotPasswordSubtitle: string;
    sendResetCodeBtn: string;
    verifyEmailTitle: string;
    verifyEmailSubtitle: string;
    otpCodeLabel: string;
    otpCodePlaceholder: string;
    newPasswordLabel: string;
    newPasswordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    verifyAndLoginBtn: string;
    resetPasswordBtn: string;
    resendCodeBtn: string;
    resendWait: string;
    backToLogin: string;
    codeSentSuccess: string;
    passwordsDoNotMatch: string;
    resetSuccess: string;
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
  notifications: {
    title: string;
    subtitle: string;
    bellTooltip: string;
    permissionStatus: string;
    permissionStatusApp: string;
    permissionGranted: string;
    permissionDenied: string;
    permissionDefault: string;
    requestPermissionBtn: string;
    requestPermissionAppBtn: string;
    permissionDeniedAppHelp: string;
    sendTestBtn: string;
    testSent: string;
    globalSettings: string;
    enableNotifications: string;
    defaultAnticipation: string;
    minutesBefore: string;
    soundAlerts: string;
    inAppBanner: string;
    todaySchedule: string;
    noUpcomingToday: string;
    minutesLeft: string;
    pickupAt: string;
    cardReminderActive: string;
    cardReminderDisabled: string;
    toggleCardReminder: string;
    setLeadTime: string;
    useGlobalDefault: string;
    testNotificationTitle: string;
    testNotificationBody: string;
    reminderNotificationTitle: string;
    reminderNotificationBody: string;
    close: string;
    saved: string;
    customTime: string;
  };
  mobileApp: {
    downloadTitle: string;
    downloadSubtitle: string;
    downloadBtn: string;
    bannerTitle: string;
    bannerDesc: string;
    bannerBtn: string;
    qrTitle: string;
    qrSubtitle: string;
    howToInstall: string;
    step1: string;
    step2: string;
    step3: string;
    updatesNoticeTitle: string;
    updatesNoticeDesc: string;
    updateAvailable: string;
    updateDesc: string;
    updateBtn: string;
    dismiss: string;
    versionInfo: string;
    checkUpdates: string;
    appUpToDate: string;
    modalUpdateTitle: string;
    modalUpdateSubtitle: string;
    versionChange: string;
    releaseNotesTitle: string;
    noReleaseNotes: string;
    inAppUpdateDesc: string;
    downloadAndInstallBtn: string;
    downloadingProgress: string;
    installingStatus: string;
    installingHint: string;
    permissionNeededTitle: string;
    permissionNeededDesc: string;
    openSettingsBtn: string;
    updateErrorTitle: string;
    retryBtn: string;
    fallbackDownloadBtn: string;
    readyToInstall: string;
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
      version: '',
      mobileReady: 'Optimizado para Web y Móvil'
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
      localBadge: 'Modo Local',
      openInGoogleMaps: 'Abrir en Google Maps',
      navigateStop: 'Ver en Google Maps'
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
      migrateNo: 'No por ahora',
      forgotPasswordLink: '¿Olvidaste tu contraseña?',
      forgotPasswordTitle: 'Recuperar Contraseña',
      forgotPasswordSubtitle: 'Te enviaremos un código de 6 dígitos a tu correo.',
      sendResetCodeBtn: 'Enviar Código de Recuperación',
      verifyEmailTitle: 'Verifica tu Correo',
      verifyEmailSubtitle: 'Ingresa el código de 6 dígitos que enviamos a {email}.',
      otpCodeLabel: 'Código de 6 dígitos',
      otpCodePlaceholder: '123456',
      newPasswordLabel: 'Nueva Contraseña',
      newPasswordPlaceholder: 'Mínimo 6 caracteres',
      confirmPasswordLabel: 'Confirmar Contraseña',
      confirmPasswordPlaceholder: 'Repite tu nueva contraseña',
      verifyAndLoginBtn: 'Confirmar y Entrar',
      resetPasswordBtn: 'Restablecer e Iniciar Sesión',
      resendCodeBtn: 'Reenviar código',
      resendWait: 'Reenviar en {sec}s',
      backToLogin: 'Volver a Iniciar Sesión',
      codeSentSuccess: '¡Código enviado! Revisa tu bandeja de entrada o spam.',
      passwordsDoNotMatch: 'Las contraseñas no coinciden.',
      resetSuccess: 'Contraseña cambiada exitosamente.'
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
    },
    notifications: {
      title: 'Centro de Notificaciones & Recordatorios',
      subtitle: 'Configura avisos automáticos previos a los horarios de recogida de tus pasajeros.',
      bellTooltip: 'Configuración y avisos de recogida',
      permissionStatus: 'Permisos del Navegador',
      permissionStatusApp: 'Permisos en el Dispositivo',
      permissionGranted: 'Permitidas (Activo)',
      permissionDenied: 'Bloqueadas por el navegador',
      permissionDefault: 'Pendiente de autorización',
      requestPermissionBtn: 'Habilitar Notificaciones Web',
      requestPermissionAppBtn: 'Habilitar Notificaciones',
      permissionDeniedAppHelp: 'Para recibirlas, puedes activarlas desde los Ajustes de tu teléfono > Aplicaciones > Passengo > Notificaciones.',
      sendTestBtn: 'Enviar Notificación de Prueba',
      testSent: '¡Notificación de prueba enviada!',
      globalSettings: 'Ajustes Generales',
      enableNotifications: 'Activar recordatorios automáticos de recogida',
      defaultAnticipation: 'Tiempo de anticipación por defecto',
      minutesBefore: 'minutos antes de la hora de recogida',
      soundAlerts: 'Sonido de campana / alerta sonora',
      inAppBanner: 'Aviso visual en pantalla (Toast)',
      todaySchedule: 'Horarios de Recogida Programados para Hoy',
      noUpcomingToday: 'No hay recogidas programadas para hoy con alertas activas.',
      minutesLeft: 'en {min} min',
      pickupAt: 'Recogida a las {time}',
      cardReminderActive: 'Aviso activo ({min}m antes)',
      cardReminderDisabled: 'Avisos desactivados',
      toggleCardReminder: 'Activar/Desactivar avisos',
      setLeadTime: 'Anticipación del aviso',
      useGlobalDefault: 'Usar tiempo global ({min}m)',
      testNotificationTitle: '🔔 Passengo: Notificación de Prueba',
      testNotificationBody: 'El sistema de recordatorios está funcionando correctamente.',
      reminderNotificationTitle: '🔔 Recogida en {min} min: {name}',
      reminderNotificationBody: 'A las {time} en {origin}. Destino: {destination}',
      close: 'Cerrar',
      saved: 'Configuración guardada correctamente',
      customTime: 'Personalizado'
    },
    mobileApp: {
      downloadTitle: 'App Móvil Passengo para Android',
      downloadSubtitle: 'Descarga el APK para acceso rápido, funcionamiento 100% offline y recordatorios con sonido.',
      downloadBtn: 'Descargar APK Android',
      bannerTitle: '¿Usas Android?',
      bannerDesc: 'Descarga la app oficial para usarla sin conexión y recibir alertas con sonido.',
      bannerBtn: 'Descargar APK',
      qrTitle: 'Escanea para descargar en tu teléfono',
      qrSubtitle: 'Apunta la cámara de tu móvil para descargar directamente el instalador.',
      howToInstall: '¿Cómo instalar en 3 sencillos pasos?',
      step1: '1. Descarga el archivo Passengo.apk desde el botón o código QR.',
      step2: '2. Abre el archivo. Si Android lo solicita, activa "Permitir desde esta fuente".',
      step3: '3. Pulsa "Instalar" y ¡listo! Ya puedes acceder a tus rutas y pasajeros.',
      updatesNoticeTitle: 'Avisos de Actualización',
      updatesNoticeDesc: 'La aplicación te notificará en pantalla cuando haya nuevas mejoras disponibles para mantenerla al día fácilmente.',
      updateAvailable: '¡Nueva versión disponible ({version})!',
      updateDesc: 'Hay una nueva actualización disponible con mejoras. Pulsa para descargar e instalar.',
      updateBtn: 'Actualizar App',
      dismiss: 'Descartar',
      versionInfo: 'Versión actual: {version}',
      appUpToDate: 'App al día (v{version})',
      checkUpdates: 'Buscar actualizaciones',
      modalUpdateTitle: 'Actualización Disponible',
      modalUpdateSubtitle: 'Una nueva versión de Passengo está lista para ti.',
      versionChange: 'Versión actual: {from} ➔ Nueva: {to}',
      releaseNotesTitle: 'Novedades de esta versión',
      noReleaseNotes: 'Mejoras de rendimiento y correcciones generales.',
      inAppUpdateDesc: 'La actualización se descargará directamente en la memoria temporal de la app sin duplicar archivos ni llenar tu carpeta de descargas.',
      downloadAndInstallBtn: 'Descargar e Instalar Ahora',
      downloadingProgress: 'Descargando actualización ({percent}%)...',
      installingStatus: 'Abriendo instalador del sistema Android...',
      installingHint: 'Por favor confirma la instalación cuando aparezca la ventana de Android.',
      permissionNeededTitle: 'Permiso necesario',
      permissionNeededDesc: 'Para actualizar la app directamente, debes habilitar el permiso "Instalar aplicaciones desconocidas" para Passengo.',
      openSettingsBtn: 'Abrir Ajustes de Android',
      updateErrorTitle: 'Error al actualizar',
      retryBtn: 'Reintentar',
      fallbackDownloadBtn: 'Descargar con navegador web',
      readyToInstall: 'Descarga completa. Listo para instalar.'
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
      version: '',
      mobileReady: 'Optimized for Web & Mobile'
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
      localBadge: 'Local Mode',
      openInGoogleMaps: 'Open in Google Maps',
      navigateStop: 'View in Google Maps'
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
      migrateNo: 'Not now',
      forgotPasswordLink: 'Forgot your password?',
      forgotPasswordTitle: 'Reset Password',
      forgotPasswordSubtitle: 'We will send a 6-digit code to your email.',
      sendResetCodeBtn: 'Send Recovery Code',
      verifyEmailTitle: 'Verify Your Email',
      verifyEmailSubtitle: 'Enter the 6-digit code sent to {email}.',
      otpCodeLabel: '6-Digit Code',
      otpCodePlaceholder: '123456',
      newPasswordLabel: 'New Password',
      newPasswordPlaceholder: 'Minimum 6 characters',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Repeat your new password',
      verifyAndLoginBtn: 'Confirm & Sign In',
      resetPasswordBtn: 'Reset & Sign In',
      resendCodeBtn: 'Resend code',
      resendWait: 'Resend in {sec}s',
      backToLogin: 'Back to Sign In',
      codeSentSuccess: 'Code sent! Check your inbox or spam folder.',
      passwordsDoNotMatch: 'Passwords do not match.',
      resetSuccess: 'Password reset successfully.'
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
    },
    notifications: {
      title: 'Notification & Reminder Center',
      subtitle: 'Set up automated alerts prior to each passenger pickup time.',
      bellTooltip: 'Pickup reminder settings & status',
      permissionStatus: 'Browser Notification Permission',
      permissionStatusApp: 'Device Notification Permission',
      permissionGranted: 'Allowed (Active)',
      permissionDenied: 'Blocked by browser',
      permissionDefault: 'Pending permission',
      requestPermissionBtn: 'Enable Web Notifications',
      requestPermissionAppBtn: 'Enable Notifications',
      permissionDeniedAppHelp: 'To receive alerts, you can enable them in your phone Settings > Apps > Passengo > Notifications.',
      sendTestBtn: 'Send Test Notification',
      testSent: 'Test notification sent!',
      globalSettings: 'General Settings',
      enableNotifications: 'Enable automated pickup reminders',
      defaultAnticipation: 'Default lead time',
      minutesBefore: 'minutes before scheduled pickup',
      soundAlerts: 'Chime sound / audible alert',
      inAppBanner: 'On-screen toast notification',
      todaySchedule: "Today's Scheduled Pickups",
      noUpcomingToday: 'No pickups scheduled for today with active alerts.',
      minutesLeft: 'in {min} min',
      pickupAt: 'Pickup at {time}',
      cardReminderActive: 'Alert active ({min}m before)',
      cardReminderDisabled: 'Alerts disabled',
      toggleCardReminder: 'Toggle alerts',
      setLeadTime: 'Alert lead time',
      useGlobalDefault: 'Use global default ({min}m)',
      testNotificationTitle: '🔔 Passengo: Test Notification',
      testNotificationBody: 'The pickup reminder system is working properly.',
      reminderNotificationTitle: '🔔 Pickup in {min} min: {name}',
      reminderNotificationBody: 'At {time} at {origin}. Destination: {destination}',
      close: 'Close',
      saved: 'Settings saved successfully',
      customTime: 'Custom'
    },
    mobileApp: {
      downloadTitle: 'Passengo Android Mobile App',
      downloadSubtitle: 'Download the APK for faster access, 100% offline support and audible reminders.',
      downloadBtn: 'Download Android APK',
      bannerTitle: 'Using Android?',
      bannerDesc: 'Download the official app to use it offline and get audible pickup alerts.',
      bannerBtn: 'Download APK',
      qrTitle: 'Scan to download on your phone',
      qrSubtitle: 'Point your phone camera to download the installer directly.',
      howToInstall: 'How to install in 3 easy steps?',
      step1: '1. Download Passengo.apk via the button or QR code.',
      step2: '2. Open the file. If prompted by Android, enable "Allow from this source".',
      step3: '3. Tap "Install" and you are ready! Start managing your routes and passengers.',
      updatesNoticeTitle: 'App Updates',
      updatesNoticeDesc: 'The app will notify you on screen when improvements are available to keep it up to date easily.',
      updateAvailable: 'New version available ({version})!',
      updateDesc: 'A newer release is available with improvements. Tap to download and install.',
      updateBtn: 'Update App',
      dismiss: 'Dismiss',
      versionInfo: 'Current version: {version}',
      appUpToDate: 'App up to date (v{version})',
      checkUpdates: 'Check for updates',
      modalUpdateTitle: 'Update Available',
      modalUpdateSubtitle: 'A new version of Passengo is ready for you.',
      versionChange: 'Current: {from} ➔ New: {to}',
      releaseNotesTitle: 'What\'s new in this release',
      noReleaseNotes: 'Performance improvements and bug fixes.',
      inAppUpdateDesc: 'The update will be downloaded directly to temporary app cache without duplicating files or cluttering your Downloads folder.',
      downloadAndInstallBtn: 'Download & Install Now',
      downloadingProgress: 'Downloading update ({percent}%)...',
      installingStatus: 'Launching Android package installer...',
      installingHint: 'Please confirm the installation when the Android prompt appears.',
      permissionNeededTitle: 'Permission Required',
      permissionNeededDesc: 'To update the app directly, please enable "Install unknown apps" for Passengo in Android Settings.',
      openSettingsBtn: 'Open Android Settings',
      updateErrorTitle: 'Update Error',
      retryBtn: 'Retry',
      fallbackDownloadBtn: 'Download via web browser',
      readyToInstall: 'Download complete. Ready to install.'
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
