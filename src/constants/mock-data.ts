export const quickActions = [
  { label: 'Agregar movimiento', route: '/add-transaction' },
  { label: 'Movimientos', route: '/movements' },
  { label: 'Presupuesto', route: '/budget' },
  { label: 'Metas de ahorro', route: '/savings-goals' },
  { label: 'Instant Duo', route: '/instant-duo' },
  { label: 'Calendario', route: '/calendar' },
  { label: 'Ajustes', route: '/settings' },
  { label: 'Onboarding', route: '/onboarding' },
];

export const highlightCards = {
  monthly: { label: 'Disponible mensual', amount: '$410.000', hint: 'Luego de gastos fijos' },
  weekly: { label: 'Disponible semanal', amount: '$98.000', hint: 'Semana actual' },
};

export const summaryStats = [
  { label: 'Ingresos', value: '$530.000', tone: 'positive' },
  { label: 'Gastos', value: '$182.450', tone: 'neutral' },
  { label: 'Ahorro', value: '$72.000', tone: 'positive' },
];

export const recentMovements = [
  {
    id: 'mov-1',
    title: 'Supermercado',
    category: 'Hogar',
    amount: '-$24.300',
    date: 'Hoy, 10:24',
    account: 'Visa Débito',
  },
  {
    id: 'mov-2',
    title: 'Freelance UX',
    category: 'Ingresos',
    amount: '+$120.000',
    date: 'Ayer, 18:10',
    account: 'Transferencia',
  },
  {
    id: 'mov-3',
    title: 'Suscripción Música',
    category: 'Servicios',
    amount: '-$3.200',
    date: 'Ayer, 08:42',
    account: 'Mastercard',
  },
  {
    id: 'mov-4',
    title: 'Café con amigos',
    category: 'Ocio',
    amount: '-$4.800',
    date: 'Mié, 20:18',
    account: 'Efectivo',
  },
];

export const upcomingBills = [
  { id: 'bill-1', title: 'Alquiler', due: '18 mar', amount: '$120.000' },
  { id: 'bill-2', title: 'Internet', due: '21 mar', amount: '$9.800' },
  { id: 'bill-3', title: 'Tarjeta Visa', due: '25 mar', amount: '$38.400' },
];

export const movementFilters = ['Todo', 'Gastos', 'Ingresos', 'Suscripciones'];

export const movementGroups = [
  {
    label: 'Hoy',
    total: '-$29.100',
    items: [
      {
        id: 'mov-1',
        title: 'Supermercado',
        category: 'Hogar',
        amount: '-$24.300',
        account: 'Visa Débito',
        time: '10:24',
        type: 'expense',
      },
      {
        id: 'mov-5',
        title: 'Café de paso',
        category: 'Ocio',
        amount: '-$4.800',
        account: 'Efectivo',
        time: '08:05',
        type: 'expense',
      },
    ],
  },
  {
    label: 'Ayer',
    total: '+$112.400',
    items: [
      {
        id: 'mov-2',
        title: 'Sueldo',
        category: 'Ingresos',
        amount: '+$320.000',
        account: 'Transferencia',
        time: '09:10',
        type: 'income',
      },
      {
        id: 'mov-3',
        title: 'Suscripción Spotify',
        category: 'Servicios',
        amount: '-$3.200',
        account: 'Mastercard',
        time: '08:42',
        type: 'expense',
      },
      {
        id: 'mov-6',
        title: 'Ahorro automático',
        category: 'Ahorro',
        amount: '-$204.400',
        account: 'Caja de ahorro',
        time: '07:55',
        type: 'expense',
      },
    ],
  },
  {
    label: 'Lun, 11 mar',
    total: '-$38.900',
    items: [
      {
        id: 'mov-7',
        title: 'Transporte',
        category: 'Movilidad',
        amount: '-$6.400',
        account: 'SUBE',
        time: '18:20',
        type: 'expense',
      },
      {
        id: 'mov-8',
        title: 'Salida con amigos',
        category: 'Ocio',
        amount: '-$12.500',
        account: 'Visa',
        time: '22:30',
        type: 'expense',
      },
      {
        id: 'mov-9',
        title: 'Supermercado',
        category: 'Hogar',
        amount: '-$20.000',
        account: 'Débito',
        time: '12:12',
        type: 'expense',
      },
    ],
  },
];

export const budgetOverview = {
  monthIncome: '$530.000',
  fixedExpenses: '$188.000',
  plannedSavings: '$72.000',
  monthAvailable: '$270.000',
  weekAvailable: '$98.000',
  monthProgress: 0.44,
};

export const budgetSummary = {
  monthBudget: '$410.000',
  weekBudget: '$98.000',
  spent: '$182.450',
  remaining: '$227.550',
};

export const budgetCategories = [
  { id: 'cat-1', label: 'Hogar', spent: 72300, limit: 120000 },
  { id: 'cat-2', label: 'Comida', spent: 48600, limit: 80000 },
  { id: 'cat-3', label: 'Transporte', spent: 21400, limit: 50000 },
  { id: 'cat-4', label: 'Ocio', spent: 9800, limit: 30000 },
  { id: 'cat-5', label: 'Servicios', spent: 16200, limit: 35000 },
];

export const savingsGoals = [
  {
    id: 'goal-1',
    title: 'Viaje a Bariloche',
    target: '$900.000',
    saved: '$420.000',
    progress: 0.47,
    due: 'Oct 2026',
  },
  {
    id: 'goal-2',
    title: 'Fondo de emergencia',
    target: '$1.200.000',
    saved: '$310.000',
    progress: 0.26,
    due: 'Dic 2026',
  },
  {
    id: 'goal-3',
    title: 'Nueva notebook',
    target: '$650.000',
    saved: '$290.000',
    progress: 0.45,
    due: 'Jul 2026',
  },
];

export const calendarItems = [
  {
    id: 'cal-1',
    title: 'Pago gimnasio',
    date: '15 mar',
    amount: '$8.200',
    type: 'Recurrente',
  },
  {
    id: 'cal-2',
    title: 'Seguro auto',
    date: '18 mar',
    amount: '$22.500',
    type: 'Cuota',
  },
  {
    id: 'cal-3',
    title: 'Cuota heladera',
    date: '22 mar',
    amount: '$18.000',
    type: 'Cuota',
  },
];

export const calendarUpcoming = [
  { id: 'up-1', title: 'Alquiler', date: '18 mar', amount: '$120.000', tag: 'Prioritario' },
  { id: 'up-2', title: 'Tarjeta Visa', date: '25 mar', amount: '$38.400', tag: 'Resumen' },
  { id: 'up-3', title: 'Internet', date: '21 mar', amount: '$9.800', tag: 'Servicio' },
];

export const calendarRecurring = [
  { id: 'rec-1', title: 'Spotify', date: '20 de cada mes', amount: '$3.200' },
  { id: 'rec-2', title: 'Netflix', date: '8 de cada mes', amount: '$5.600' },
  { id: 'rec-3', title: 'Curso UX', date: '27 de cada mes', amount: '$18.000' },
];

export const calendarInstallments = [
  { id: 'ins-1', title: 'Notebook', date: '15 mar', amount: '$32.000', remaining: '4/12' },
  { id: 'ins-2', title: 'Heladera', date: '22 mar', amount: '$18.000', remaining: '2/6' },
];

export const duoSummary = {
  monthTotal: '$210.400',
  youPaid: '$126.000',
  partnerPaid: '$84.400',
  balance: 'Te deben $41.600',
};

export const duoMovements = [
  {
    id: 'duo-1',
    title: 'Supermercado',
    paidBy: 'Vos',
    amount: '$48.500',
  },
  {
    id: 'duo-2',
    title: 'Delivery',
    paidBy: 'Sofi',
    amount: '$21.900',
  },
  {
    id: 'duo-3',
    title: 'Servicios',
    paidBy: 'Vos',
    amount: '$63.200',
  },
];

export const settingsSections = [
  {
    title: 'Preferencias',
    items: ['Moneda', 'Categorías', 'Recordatorios'],
  },
  {
    title: 'Datos',
    items: ['Exportar movimientos', 'Respaldo en la nube'],
  },
  {
    title: 'Apariencia',
    items: ['Modo oscuro (próximamente)'],
  },
];

export const frequentCategories = [
  'Comida',
  'Transporte',
  'Hogar',
  'Servicios',
  'Ocio',
  'Salud',
];

export const paymentMethods = ['Efectivo', 'Débito', 'Crédito', 'Transferencia'];
