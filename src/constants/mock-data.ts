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
      },
      {
        id: 'mov-5',
        title: 'Taxi',
        category: 'Transporte',
        amount: '-$4.800',
        account: 'Efectivo',
      },
    ],
  },
  {
    label: 'Ayer',
    total: '+$116.800',
    items: [
      {
        id: 'mov-2',
        title: 'Freelance UX',
        category: 'Ingresos',
        amount: '+$120.000',
        account: 'Transferencia',
      },
      {
        id: 'mov-3',
        title: 'Suscripción Música',
        category: 'Servicios',
        amount: '-$3.200',
        account: 'Mastercard',
      },
    ],
  },
];

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
