
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { CurrencySelect } from '@/components/ui/currency-select';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectableOption } from '@/components/ui/selectable-option';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDuo } from '@/hooks/use-duo';
import { useAppSettings } from '@/hooks/use-app-settings';
import { formatCurrency, formatShortDate, toISODate } from '@/lib/finance';
import { scheduleLocalNotifications } from '@/lib/notifications';
import { addTransaction } from '@/lib/transactions';
import {
  addDueDate,
  addInstallment,
  addRecurringPayment,
  DueDate,
  getDueDates,
  getInstallments,
  getRecurringPayments,
  Installment,
  RecurringPayment,
  removeDueDate,
  removeInstallment,
  removeRecurringPayment,
  saveInstallments,
  updateDueDate,
  updateInstallment,
  updateRecurringPayment,
} from '@/lib/calendar';
import { addCategory, getCategories } from '@/lib/categories';
import { addPaymentMethod, BASE_PAYMENT_METHODS, getPaymentMethods } from '@/lib/payment-methods';

const TABS = ['Próximos vencimientos', 'Recurrentes', 'Cuotas'] as const;
const ADD_TYPES = ['Pago único', 'Recurrente', 'Cuota'] as const;

type Tab = (typeof TABS)[number];
type AddType = (typeof ADD_TYPES)[number];
type PickerTarget = 'dueDate' | 'recNextDate' | 'recEndDate' | 'instNextDate' | null;

type RecurringFrequency = 'weekly' | 'monthly' | 'everyX';
type DurationType = 'indefinite' | 'months' | 'until';

function getNativeDateTimePicker() {
  if (Platform.OS === 'web') {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-community/datetimepicker').default;
  } catch {
    return null;
  }
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[^0-9,.-]/g, '');
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function daysUntil(date: string) {
  const target = new Date(date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  return diff;
}

function formatCalendarDate(dateStr: string) {
  return dateStr.replace(/-/g, '');
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getNextRecurringExecution(item: RecurringPayment) {
  const current = new Date(item.nextDate + 'T00:00:00');
  if (item.frequency === 'weekly') return addDays(current, 7);
  if (item.frequency === 'everyX') return addDays(current, Math.max(item.everyDays ?? 1, 1));
  return addMonths(current, 1);
}

async function openGoogleCalendarEvent(title: string, dateStr: string, details?: string) {
  const start = formatCalendarDate(dateStr);
  const end = formatCalendarDate(dateStr);
  const url =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${start}/${end}` +
    (details ? `&details=${encodeURIComponent(details)}` : '');
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Google Calendar', 'No pudimos abrir el calendario.');
  }
}

export default function CalendarScreen() {
  const theme = useTheme();
  const { state: duoState } = useDuo();
  const isDuo = duoState.activeContext === 'duo';
  const primary = isDuo ? theme.duoAccent : theme.brand;
  const primarySoft = isDuo ? (theme.duoSupport ?? theme.brandSoft) : theme.brandSoft;
  const accentAlt = isDuo ? (theme.duoAlt ?? theme.accent) : theme.accent;
  const { settings: appSettings, update } = useAppSettings();
  const params = useLocalSearchParams<{ tab?: string }>();
  const NativeDateTimePicker = useMemo(() => getNativeDateTimePicker(), []);

  const [activeTab, setActiveTab] = useState<Tab>('Próximos vencimientos');
  const [dueDates, setDueDates] = useState<DueDate[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [categories, setCategories] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>(BASE_PAYMENT_METHODS);

  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<AddType>('Pago único');
  const [editingItem, setEditingItem] = useState<{ type: AddType; id: string } | null>(null);
  const isEditing = Boolean(editingItem);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [showSelect, setShowSelect] = useState(false);
  const [selectTarget, setSelectTarget] = useState<
    | 'dueCategory'
    | 'dueMethod'
    | 'recCategory'
    | 'recMethod'
    | 'instCategory'
    | 'instMethod'
    | null
  >(null);
  const [newOption, setNewOption] = useState('');
  const [addingOption, setAddingOption] = useState(false);

  const [dueName, setDueName] = useState('');
  const [dueAmount, setDueAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [dueCurrency, setDueCurrency] = useState(appSettings.currency);
  const [dueCategory, setDueCategory] = useState('');
  const [dueMethod, setDueMethod] = useState('');
  const [dueNote, setDueNote] = useState('');
  const [dueImportant, setDueImportant] = useState(false);
  const [dueCalendarExport, setDueCalendarExport] = useState(false);

  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCurrency, setRecCurrency] = useState(appSettings.currency);
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('monthly');
  const [recEveryDays, setRecEveryDays] = useState('30');
  const [recNextDate, setRecNextDate] = useState<Date>(new Date());
  const [recCategory, setRecCategory] = useState('');
  const [recMethod, setRecMethod] = useState('');
  const [recDurationType, setRecDurationType] = useState<DurationType>('indefinite');
  const [recDurationMonths, setRecDurationMonths] = useState('6');
  const [recEndDate, setRecEndDate] = useState<Date>(new Date());
  const [recImportant, setRecImportant] = useState(false);
  const [recCalendarExport, setRecCalendarExport] = useState(false);

  const [instName, setInstName] = useState('');
  const [instAmount, setInstAmount] = useState('');
  const [instCurrency, setInstCurrency] = useState(appSettings.currency);
  const [instTotal, setInstTotal] = useState('');
  const [instCurrent, setInstCurrent] = useState('');
  const [instNextDate, setInstNextDate] = useState<Date>(new Date());
  const [instCategory, setInstCategory] = useState('');
  const [instMethod, setInstMethod] = useState('');
  const [instImportant, setInstImportant] = useState(false);
  const [instCalendarExport, setInstCalendarExport] = useState(false);

  const [importantHint, setImportantHint] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getDueDates(), getRecurringPayments(), getInstallments(), getCategories(), getPaymentMethods()]).then(
        ([due, rec, inst, cats, storedMethods]) => {
          setDueDates(due);
          setRecurring(rec);
          setInstallments(inst);
          setCategories(cats);
          setMethods(Array.from(new Set([...storedMethods, ...BASE_PAYMENT_METHODS])));
        }
      );
    }, [duoState.activeContext, duoState.duoId])
  );

  useEffect(() => {
    if (!params?.tab) return;
    if (params.tab === 'due') setActiveTab('Próximos vencimientos');
    if (params.tab === 'recurring') setActiveTab('Recurrentes');
    if (params.tab === 'installments') setActiveTab('Cuotas');
  }, [params?.tab]);

  useEffect(() => {
    scheduleLocalNotifications();
  }, [dueDates, recurring, installments]);

  const activeDueDates = useMemo(() => dueDates.filter((item) => item.status !== 'paid'), [dueDates]);
  const activeRecurring = useMemo(
    () => recurring.filter((item) => item.status === 'active'),
    [recurring]
  );
  const activeInstallments = useMemo(
    () => installments.filter((item) => item.status !== 'completed'),
    [installments]
  );

  const upcomingItems = useMemo(() => {
    const dueItems = activeDueDates.map((item) => ({
      key: `due-${item.id}`,
      source: 'due' as const,
      id: item.id,
      name: item.name,
      amount: item.amount,
      currency: item.currency,
      date: item.date,
      important: item.important,
    }));
    const recItems = activeRecurring.map((item) => ({
      key: `rec-${item.id}`,
      source: 'rec' as const,
      id: item.id,
      name: item.name,
      amount: item.amount,
      currency: item.currency,
      date: item.nextDate,
      important: item.important,
    }));
    const instItems = activeInstallments.map((item) => ({
      key: `inst-${item.id}`,
      source: 'inst' as const,
      id: item.id,
      name: item.name,
      amount: item.amount,
      currency: item.currency,
      date: item.nextDate,
      important: item.important,
    }));
    return [...dueItems, ...recItems, ...instItems].sort((a, b) => a.date.localeCompare(b.date));
  }, [activeDueDates, activeInstallments, activeRecurring]);

  const sortedRecurring = useMemo(
    () => [...recurring].sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
    [recurring]
  );

  const sortedInstallments = useMemo(
    () => [...activeInstallments].sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
    [activeInstallments]
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    const defaultType =
      activeTab === 'Cuotas' ? 'Cuota' : activeTab === 'Recurrentes' ? 'Recurrente' : 'Pago único';
    setAddType(defaultType);
    setShowAdd(true);
  };

  const resetForms = () => {
    setDueName('');
    setDueAmount('');
    setDueDate(new Date());
    setDueCurrency(appSettings.currency);
    setDueCategory('');
    setDueMethod('');
    setDueNote('');
    setDueImportant(false);
    setDueCalendarExport(false);

    setRecName('');
    setRecAmount('');
    setRecCurrency(appSettings.currency);
    setRecFrequency('monthly');
    setRecEveryDays('30');
    setRecNextDate(new Date());
    setRecCategory('');
    setRecMethod('');
    setRecDurationType('indefinite');
    setRecDurationMonths('6');
    setRecEndDate(new Date());
    setRecImportant(false);
    setRecCalendarExport(false);

    setInstName('');
    setInstAmount('');
    setInstCurrency(appSettings.currency);
    setInstTotal('');
    setInstCurrent('');
    setInstNextDate(new Date());
    setInstCategory('');
    setInstMethod('');
    setInstImportant(false);
    setInstCalendarExport(false);

    setNewOption('');
    setAddingOption(false);
    setImportantHint(null);
    setEditingItem(null);
  };

  const handleImportantToggle = async (value: boolean, setValue: (next: boolean) => void, clearExport: () => void) => {
    setValue(value);
    if (!value) {
      clearExport();
      return;
    }
    if (!appSettings.notifications.importantHintShown) {
      const message = appSettings.notifications.importantEnabled
        ? 'Notificaciones activas para este pago importante.'
        : 'Marcado como importante. Activá “Importantes” en Notificaciones para recibir recordatorios.';
      setImportantHint(message);
      await update({ notifications: { importantHintShown: true } });
    }
  };

  const handleSave = async () => {
    if (addType === 'Pago único') {
      const name = dueName.trim();
      const amount = parseAmount(dueAmount);
      if (!name || !amount) {
        Alert.alert('Completá el vencimiento', 'Agregá un nombre y un monto válido.');
        return;
      }
      const payload = {
        name,
        amount,
        currency: dueCurrency,
        date: toISODate(dueDate),
        category: dueCategory || undefined,
        method: dueMethod || undefined,
        note: dueNote.trim() || undefined,
        important: dueImportant,
        calendarExported: dueCalendarExport,
        status: 'pending',
      };
      if (editingItem?.type === 'Pago único') {
        const next = await updateDueDate(editingItem.id, payload);
        setDueDates(next);
      } else {
        const item: DueDate = {
          id: String(Date.now()),
          createdAt: new Date().toISOString(),
          ...payload,
        };
        const next = await addDueDate(item);
        setDueDates(next);
        if (dueCalendarExport) {
          await openGoogleCalendarEvent(name, item.date, 'Pago único en Instant');
        }
      }
    }

    if (addType === 'Recurrente') {
      const name = recName.trim();
      const amount = parseAmount(recAmount);
      if (!name || !amount) {
        Alert.alert('Completá la recurrencia', 'Agregá un nombre y un monto válido.');
        return;
      }
      const payload = {
        name,
        amount,
        currency: recCurrency,
        frequency: recFrequency,
        everyDays: recFrequency === 'everyX' ? Math.max(parseAmount(recEveryDays), 1) : undefined,
        nextDate: toISODate(recNextDate),
        durationType: recDurationType,
        durationMonths: recDurationType === 'months' ? Math.max(parseAmount(recDurationMonths), 1) : undefined,
        endDate: recDurationType === 'until' ? toISODate(recEndDate) : undefined,
        category: recCategory || undefined,
        method: recMethod || undefined,
        important: recImportant,
        calendarExported: recCalendarExport,
      };
      if (editingItem?.type === 'Recurrente') {
        const next = await updateRecurringPayment(editingItem.id, payload);
        setRecurring(next);
      } else {
        const next = await addRecurringPayment({
          id: String(Date.now()),
          status: 'active',
          createdAt: new Date().toISOString(),
          ...payload,
        });
        setRecurring(next);
        if (recCalendarExport) {
          await openGoogleCalendarEvent(name, payload.nextDate, 'Pago recurrente en Instant');
        }
      }
    }

    if (addType === 'Cuota') {
      const name = instName.trim();
      const amount = parseAmount(instAmount);
      const total = Math.max(parseAmount(instTotal), 0);
      const current = Math.max(parseAmount(instCurrent || '1'), 1);
      if (!name || !amount || !total) {
        Alert.alert('Completá la cuota', 'Agregá nombre, monto y cantidad total.');
        return;
      }
      const payload = {
        name,
        amount,
        currency: instCurrency,
        total,
        current: Math.min(current, total),
        nextDate: toISODate(instNextDate),
        category: instCategory || undefined,
        method: instMethod || undefined,
        important: instImportant,
        calendarExported: instCalendarExport,
      };
      if (editingItem?.type === 'Cuota') {
        const next = await updateInstallment(editingItem.id, payload);
        setInstallments(next);
      } else {
        const next = await addInstallment({
          id: String(Date.now()),
          status: 'active',
          createdAt: new Date().toISOString(),
          ...payload,
        });
        setInstallments(next);
        if (instCalendarExport) {
          await openGoogleCalendarEvent(name, payload.nextDate, 'Cuota en Instant');
        }
      }
    }

    resetForms();
    setShowAdd(false);
  };

  const handleEditRecurring = (item: RecurringPayment) => {
    resetForms();
    setEditingItem({ type: 'Recurrente', id: item.id });
    setAddType('Recurrente');
    setRecName(item.name);
    setRecAmount(String(item.amount));
    setRecCurrency(item.currency);
    setRecFrequency(item.frequency);
    setRecEveryDays(String(item.everyDays ?? 30));
    setRecNextDate(new Date(item.nextDate + 'T00:00:00'));
    setRecDurationType(item.durationType ?? 'indefinite');
    setRecDurationMonths(String(item.durationMonths ?? 6));
    setRecEndDate(item.endDate ? new Date(item.endDate + 'T00:00:00') : new Date());
    setRecCategory(item.category ?? '');
    setRecMethod(item.method ?? '');
    setRecImportant(Boolean(item.important));
    setRecCalendarExport(Boolean(item.calendarExported));
    setShowAdd(true);
  };

  const handleEditDueDate = (item: DueDate) => {
    resetForms();
    setEditingItem({ type: 'Pago único', id: item.id });
    setAddType('Pago único');
    setDueName(item.name);
    setDueAmount(String(item.amount));
    setDueCurrency(item.currency);
    setDueDate(new Date(item.date + 'T00:00:00'));
    setDueCategory(item.category ?? '');
    setDueMethod(item.method ?? '');
    setDueNote(item.note ?? '');
    setDueImportant(Boolean(item.important));
    setDueCalendarExport(Boolean(item.calendarExported));
    setShowAdd(true);
  };

  const openDueDateEditor = (id: string) => {
    const item = dueDates.find((entry) => entry.id === id);
    if (!item) return;
    handleEditDueDate(item);
  };

  const handleEditInstallment = (item: Installment) => {
    resetForms();
    setEditingItem({ type: 'Cuota', id: item.id });
    setAddType('Cuota');
    setInstName(item.name);
    setInstAmount(String(item.amount));
    setInstCurrency(item.currency);
    setInstTotal(String(item.total));
    setInstCurrent(String(item.current));
    setInstNextDate(new Date(item.nextDate + 'T00:00:00'));
    setInstCategory(item.category ?? '');
    setInstMethod(item.method ?? '');
    setInstImportant(Boolean(item.important));
    setInstCalendarExport(Boolean(item.calendarExported));
    setShowAdd(true);
  };

  const openSelect = (
    target: 'dueCategory' | 'dueMethod' | 'recCategory' | 'recMethod' | 'instCategory' | 'instMethod'
  ) => {
    setSelectTarget(target);
    setNewOption('');
    setAddingOption(false);
    setShowSelect(true);
  };

  const currentSelection = () => {
    switch (selectTarget) {
      case 'dueCategory':
        return dueCategory;
      case 'dueMethod':
        return dueMethod;
      case 'recCategory':
        return recCategory;
      case 'recMethod':
        return recMethod;
      case 'instCategory':
        return instCategory;
      case 'instMethod':
        return instMethod;
      default:
        return '';
    }
  };

  const updateSelection = (value: string) => {
    switch (selectTarget) {
      case 'dueCategory':
        setDueCategory(value);
        break;
      case 'dueMethod':
        setDueMethod(value);
        break;
      case 'recCategory':
        setRecCategory(value);
        break;
      case 'recMethod':
        setRecMethod(value);
        break;
      case 'instCategory':
        setInstCategory(value);
        break;
      case 'instMethod':
        setInstMethod(value);
        break;
      default:
        break;
    }
  };

  const optionsForSelect = selectTarget?.includes('Category') ? categories : methods;

  const handleAddOption = async () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (selectTarget?.includes('Category')) {
      const next = await addCategory(trimmed);
      setCategories(next);
    } else {
      const updated = await addPaymentMethod(trimmed);
      setMethods(Array.from(new Set([...updated, ...BASE_PAYMENT_METHODS])));
    }
    updateSelection(trimmed);
    setNewOption('');
    setAddingOption(false);
    setShowSelect(false);
  };

  const handleDeleteDue = (id: string) => {
    Alert.alert('Eliminar pago', '¿Querés eliminar este pago único?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const next = await removeDueDate(id);
          setDueDates(next);
        },
      },
    ]);
  };

  const handleMarkDuePaid = async (id: string) => {
    const next = await updateDueDate(id, { status: 'paid' });
    setDueDates(next);
  };

  const updateRecurringStatus = async (id: string, status: 'active' | 'paused' | 'ended') => {
    const next = await updateRecurringPayment(id, { status });
    setRecurring(next);
  };

  const handleDeleteRecurring = (id: string) => {
    Alert.alert('Eliminar recurrente', '¿Querés eliminar este pago recurrente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const next = await removeRecurringPayment(id);
          setRecurring(next);
        },
      },
    ]);
  };

  const handleDeleteInstallment = (id: string) => {
    Alert.alert('Eliminar cuota', '¿Querés eliminar esta cuota?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const next = await removeInstallment(id);
          setInstallments(next);
        },
      },
    ]);
  };

  const handleRegisterInstallment = async (id: string) => {
    const next = installments.map((item) => {
      if (item.id !== id) return item;
      const updatedCurrent = Math.min(item.current + 1, item.total);
      const completed = updatedCurrent >= item.total;
      return {
        ...item,
        current: updatedCurrent,
        status: completed ? 'completed' : item.status,
      };
    });
    const updatedItem = next.find((item) => item.id === id);
    if (updatedItem) {
      const stored = await updateInstallment(id, {
        current: updatedItem.current,
        status: updatedItem.status,
      });
      setInstallments(stored);
    } else {
      await saveInstallments(next);
      setInstallments(next);
    }
    const updated = next.find((item) => item.id === id);
    if (updated && updated.status === 'completed') {
      Alert.alert('Cuota completada', 'Esta cuota quedó finalizada.');
    } else {
      Alert.alert('Pago registrado', 'La cuota se registró correctamente.');
    }
  };

  const handleRegisterRecurring = async (item: RecurringPayment) => {
    const now = new Date();
    await addTransaction({
      id: String(Date.now()),
      type: 'expense',
      amount: item.amount,
      currency: item.currency,
      category: item.category || 'Recurrente',
      date: item.nextDate,
      method: item.method || item.name,
      note: `Pago recurrente registrado: ${item.name}`,
      createdAt: now.toISOString(),
    });

    const nextExecution = getNextRecurringExecution(item);
    let status: RecurringPayment['status'] = 'active';

    if (item.durationType === 'until' && item.endDate) {
      const endDate = new Date(item.endDate + 'T00:00:00');
      if (nextExecution > endDate) status = 'ended';
    }

    if (item.durationType === 'months' && item.durationMonths) {
      const createdDate = new Date(item.createdAt);
      const limitDate = addMonths(createdDate, item.durationMonths);
      if (nextExecution > limitDate) status = 'ended';
    }

    const next = await updateRecurringPayment(item.id, {
      nextDate: toISODate(nextExecution),
      status,
    });
    setRecurring(next);
    Alert.alert(
      status === 'ended' ? 'Último pago registrado' : 'Pago registrado',
      status === 'ended'
        ? 'Se registró el pago y la recurrencia quedó finalizada.'
        : 'Se registró el pago y se avanzó el próximo vencimiento.'
    );
  };

  const handleUpcomingPress = (source: 'due' | 'rec' | 'inst') => {
    if (source === 'rec') {
      setActiveTab('Recurrentes');
    } else if (source === 'inst') {
      setActiveTab('Cuotas');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Calendario</ThemedText>
          <ThemeToggle />
        </View>
        <ThemedText themeColor="textSecondary">
          Anticipate a pagos y cuotas con claridad.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Registrar pagos" />
        <View style={styles.tabsRow}>
          {TABS.map((tab) => (
            <SelectableOption
              key={tab}
              label={tab}
              selected={activeTab === tab}
              onPress={() => setActiveTab(tab)}
            />
          ))}
        </View>
        <Pressable
          onPress={handleOpenAdd}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: primary },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.addText, { color: theme.onBrand }]}>
            Agregar
          </ThemedText>
        </Pressable>
      </Card>

      {activeTab === 'Próximos vencimientos' ? (
        <Card>
          <SectionHeader title="Próximos vencimientos" />
          {upcomingItems.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Todavía no cargaste pagos.
            </ThemedText>
          ) : (
            <View style={styles.listGap}>
              {upcomingItems.map((item) => {
                const remaining = daysUntil(item.date);
                const statusLabel =
                  remaining <= 0 ? 'Hoy' : remaining <= 3 ? 'Pronto' : `En ${remaining} días`;
                const statusColor =
                  remaining <= 0 ? accentAlt : remaining <= 3 ? theme.warning : theme.textSecondary;
                const dateLabel =
                  item.source === 'due'
                    ? 'Próximo vencimiento'
                    : item.source === 'rec'
                      ? 'Próximo pago'
                      : 'Próxima cuota';
                const typeLabel = item.source === 'due' ? 'Pago único' : item.source === 'rec' ? 'Recurrente' : 'Cuota';
                const isJumpable = item.source !== 'due';
                return (
                  <Pressable
                    key={item.key}
                    disabled={!isJumpable}
                    onPress={() => handleUpcomingPress(item.source)}
                    style={({ pressed }) => [
                      styles.rowBetween,
                      pressed && isJumpable ? styles.pressed : null,
                    ]}>
                    <View style={styles.itemInfo}>
                      <ThemedText type="smallBold">
                        {item.name}
                        {item.important ? ' ★' : ''}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {dateLabel}: {formatShortDate(item.date)} · {typeLabel}
                      </ThemedText>
                      {item.source === 'due' ? (
                        <View style={styles.actionRow}>
                          <Pressable onPress={() => openDueDateEditor(item.id)} style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: primary }}>
                              Editar
                            </ThemedText>
                          </Pressable>
                          <Pressable onPress={() => handleMarkDuePaid(item.id)} style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: primary }}>
                              Marcar pagado
                            </ThemedText>
                          </Pressable>
                          <Pressable onPress={() => handleDeleteDue(item.id)} style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: theme.textSecondary }}>
                              Borrar
                            </ThemedText>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.itemRight}>
                      <ThemedText type="smallBold">
                        {formatCurrency(item.amount, item.currency)}
                      </ThemedText>
                      {item.currency !== appSettings.currency ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.currency}
                        </ThemedText>
                      ) : null}
                      <ThemedText type="small" style={{ color: statusColor }}>
                        {statusLabel}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>
      ) : null}

      {activeTab === 'Recurrentes' ? (
        <Card>
          <SectionHeader title="Pagos recurrentes" />
          {sortedRecurring.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Todavía no cargaste recurrencias.
            </ThemedText>
          ) : (
            <View style={styles.listGap}>
              {sortedRecurring.map((item) => {
                const freqLabel =
                  item.frequency === 'weekly'
                    ? 'Semanal'
                    : item.frequency === 'monthly'
                      ? 'Mensual'
                      : `Cada ${item.everyDays} días`;
                const durationLabel =
                  item.durationType === 'months'
                    ? `Por ${item.durationMonths} meses`
                    : item.durationType === 'until'
                      ? `Hasta ${formatShortDate(item.endDate || item.nextDate)}`
                      : 'Indefinido';
                const statusLabel =
                  item.status === 'paused' ? 'Pausado' : item.status === 'ended' ? 'Finalizado' : 'Activo';
                return (
                  <View key={item.id} style={styles.rowBetween}>
                    <View style={styles.itemInfo}>
                      <ThemedText type="smallBold">
                        {item.name}
                        {item.important ? ' ★' : ''}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {freqLabel} · {durationLabel}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Próximo pago: {formatShortDate(item.nextDate)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Estado: {statusLabel}
                      </ThemedText>
                      <View style={styles.actionRow}>
                        {item.status === 'active' ? (
                          <Pressable
                            onPress={() => handleRegisterRecurring(item)}
                            style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: primary }}>
                              Registrar pago
                            </ThemedText>
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() => handleEditRecurring(item)}
                          style={styles.actionButton}>
                          <ThemedText type="small" style={{ color: primary }}>
                            Editar
                          </ThemedText>
                        </Pressable>
                        {item.status === 'active' ? (
                          <Pressable
                            onPress={() => updateRecurringStatus(item.id, 'paused')}
                            style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: primary }}>
                              Pausar
                            </ThemedText>
                          </Pressable>
                        ) : item.status === 'paused' ? (
                          <Pressable
                            onPress={() => updateRecurringStatus(item.id, 'active')}
                            style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: primary }}>
                              Reanudar
                            </ThemedText>
                          </Pressable>
                        ) : null}
                        {item.status !== 'ended' ? (
                          <Pressable
                            onPress={() => updateRecurringStatus(item.id, 'ended')}
                            style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: theme.textSecondary }}>
                              Finalizar
                            </ThemedText>
                          </Pressable>
                        ) : null}
                        <Pressable onPress={() => handleDeleteRecurring(item.id)} style={styles.actionButton}>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            Borrar
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      <ThemedText type="smallBold">
                        {formatCurrency(item.amount, item.currency)}
                      </ThemedText>
                      {item.currency !== appSettings.currency ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.currency}
                        </ThemedText>
                      ) : null}
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.method || 'Método opcional'}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      ) : null}

      {activeTab === 'Cuotas' ? (
        <Card>
          <SectionHeader title="Cuotas activas" />
          {sortedInstallments.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No hay cuotas activas en este momento.
            </ThemedText>
          ) : (
            <View style={styles.listGap}>
              {sortedInstallments.map((item) => (
                <View key={item.id} style={styles.rowBetween}>
                  <View style={styles.itemInfo}>
                    <ThemedText type="smallBold">
                      {item.name}
                      {item.important ? ' ★' : ''}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Cuota actual: {item.current}/{item.total} · Próxima cuota: {formatShortDate(item.nextDate)}
                    </ThemedText>
                    <View style={styles.actionRow}>
                      <Pressable onPress={() => handleRegisterInstallment(item.id)} style={styles.actionButton}>
                        <ThemedText type="small" style={{ color: primary }}>
                          Registrar cuota
                        </ThemedText>
                      </Pressable>
                      <Pressable onPress={() => handleEditInstallment(item)} style={styles.actionButton}>
                        <ThemedText type="small" style={{ color: primary }}>
                          Editar
                        </ThemedText>
                      </Pressable>
                      <Pressable onPress={() => handleDeleteInstallment(item.id)} style={styles.actionButton}>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          Borrar
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <ThemedText type="smallBold">
                      {formatCurrency(item.amount, item.currency)}
                    </ThemedText>
                    {item.currency !== appSettings.currency ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.currency}
                      </ThemedText>
                    ) : null}
                    <ThemedText type="small" themeColor="textSecondary">
                      Faltan {Math.max(item.total - item.current, 0)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      ) : null}

      <Modal
        visible={showAdd}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{isEditing ? 'Editar registro' : 'Nuevo registro'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isEditing ? 'Actualizá los datos del pago.' : 'Elegí qué tipo de pago querés cargar.'}
              </ThemedText>
            </View>

            <View style={styles.tabsRow}>
              {ADD_TYPES.map((type) => (
                <SelectableOption
                  key={type}
                  label={type}
                  selected={addType === type}
                  onPress={() => {
                    setEditingItem(null);
                    setAddType(type);
                  }}
                />
              ))}
            </View>

            {addType === 'Pago único' ? (
              <View style={styles.formStack}>
                <TextInput
                  placeholder="Nombre"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={dueName}
                  onChangeText={setDueName}
                />
                <TextInput
                  placeholder="Monto"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={dueAmount}
                  onChangeText={setDueAmount}
                  keyboardType="numeric"
                />
                <CurrencySelect
                  value={dueCurrency}
                  onChange={setDueCurrency}
                  compact
                  style={styles.inlineCurrency}
                  label=""
                />
                <Pressable
                  onPress={() => {
                    if (NativeDateTimePicker) {
                      setPickerTarget('dueDate');
                      setShowPicker(true);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.dateBox,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Fecha
                  </ThemedText>
                  <ThemedText type="smallBold">{formatShortDate(toISODate(dueDate))}</ThemedText>
                </Pressable>
                {Platform.OS === 'web' ? (
                  <TextInput
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={toISODate(dueDate)}
                    onChangeText={(value) => {
                      const date = new Date(value + 'T00:00:00');
                      if (!Number.isNaN(date.getTime())) {
                        setDueDate(date);
                      }
                    }}
                  />
                ) : null}

                <Pressable
                  onPress={() => openSelect('dueCategory')}
                  style={({ pressed }) => [
                    styles.selectBox,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Categoría
                  </ThemedText>
                  <ThemedText type="smallBold">{dueCategory || 'Seleccionar'}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => openSelect('dueMethod')}
                  style={({ pressed }) => [
                    styles.selectBox,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Método
                  </ThemedText>
                  <ThemedText type="smallBold">{dueMethod || 'Seleccionar'}</ThemedText>
                </Pressable>
                <TextInput
                  placeholder="Nota (opcional)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={dueNote}
                  onChangeText={setDueNote}
                />
                <View style={styles.toggleRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Marcar como importante
                  </ThemedText>
                  <Switch
                    value={dueImportant}
                    onValueChange={(value) =>
                      handleImportantToggle(value, setDueImportant, () => setDueCalendarExport(false))
                    }
                    trackColor={{ false: theme.border, true: primarySoft }}
                    thumbColor={dueImportant ? primary : theme.onBrand}
                  />
                </View>
                {dueImportant ? (
                  <View style={styles.toggleRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Agregar a Google Calendar
                    </ThemedText>
                    <Switch
                      value={dueCalendarExport}
                      onValueChange={setDueCalendarExport}
                      trackColor={{ false: theme.border, true: primarySoft }}
                      thumbColor={dueCalendarExport ? primary : theme.onBrand}
                    />
                  </View>
                ) : null}
                {importantHint ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {importantHint}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}

            {addType === 'Recurrente' ? (
              <View style={styles.formStack}>
                <TextInput
                  placeholder="Nombre"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={recName}
                  onChangeText={setRecName}
                />
                <TextInput
                  placeholder="Monto"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={recAmount}
                  onChangeText={setRecAmount}
                  keyboardType="numeric"
                />
                <CurrencySelect
                  value={recCurrency}
                  onChange={setRecCurrency}
                  compact
                  style={styles.inlineCurrency}
                  label=""
                />

                <View style={styles.inlineLabel}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Frecuencia
                  </ThemedText>
                </View>
                <View style={styles.tabsRow}>
                  {['Semanal', 'Mensual', 'Cada X días'].map((label) => (
                    <SelectableOption
                      key={label}
                      label={label}
                      selected={
                        (label === 'Semanal' && recFrequency === 'weekly') ||
                        (label === 'Mensual' && recFrequency === 'monthly') ||
                        (label === 'Cada X días' && recFrequency === 'everyX')
                      }
                      onPress={() =>
                        setRecFrequency(
                          label === 'Semanal' ? 'weekly' : label === 'Mensual' ? 'monthly' : 'everyX'
                        )
                      }
                    />
                  ))}
                </View>
                {recFrequency === 'everyX' ? (
                  <TextInput
                    placeholder="Cada cuántos días"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={recEveryDays}
                    onChangeText={setRecEveryDays}
                    keyboardType="numeric"
                  />
                ) : null}

                <Pressable
                  onPress={() => {
                    if (NativeDateTimePicker) {
                      setPickerTarget('recNextDate');
                      setShowPicker(true);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.dateBox,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Próxima fecha
                  </ThemedText>
                  <ThemedText type="smallBold">{formatShortDate(toISODate(recNextDate))}</ThemedText>
                </Pressable>
                {Platform.OS === 'web' ? (
                  <TextInput
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={toISODate(recNextDate)}
                    onChangeText={(value) => {
                      const date = new Date(value + 'T00:00:00');
                      if (!Number.isNaN(date.getTime())) {
                        setRecNextDate(date);
                      }
                    }}
                  />
                ) : null}

                <View style={styles.inlineLabel}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Duración
                  </ThemedText>
                </View>
                <View style={styles.tabsRow}>
                  {['Indefinido', 'Por X meses', 'Hasta fecha'].map((label) => (
                    <SelectableOption
                      key={label}
                      label={label}
                      selected={
                        (label === 'Indefinido' && recDurationType === 'indefinite') ||
                        (label === 'Por X meses' && recDurationType === 'months') ||
                        (label === 'Hasta fecha' && recDurationType === 'until')
                      }
                      onPress={() =>
                        setRecDurationType(
                          label === 'Indefinido' ? 'indefinite' : label === 'Por X meses' ? 'months' : 'until'
                        )
                      }
                    />
                  ))}
                </View>
                {recDurationType === 'months' ? (
                  <TextInput
                    placeholder="Cantidad de meses"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={recDurationMonths}
                    onChangeText={setRecDurationMonths}
                    keyboardType="numeric"
                  />
                ) : null}
                {recDurationType === 'until' ? (
                  <Pressable
                    onPress={() => {
                      if (NativeDateTimePicker) {
                        setPickerTarget('recEndDate');
                        setShowPicker(true);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.dateBox,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Hasta fecha
                    </ThemedText>
                    <ThemedText type="smallBold">{formatShortDate(toISODate(recEndDate))}</ThemedText>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={() => openSelect('recCategory')}
                  style={({ pressed }) => [
                    styles.selectBox,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Categoría
                  </ThemedText>
                  <ThemedText type="smallBold">{recCategory || 'Seleccionar'}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => openSelect('recMethod')}
                  style={({ pressed }) => [
                    styles.selectBox,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Método
                  </ThemedText>
                  <ThemedText type="smallBold">{recMethod || 'Seleccionar'}</ThemedText>
                </Pressable>
                <View style={styles.toggleRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Marcar como importante
                  </ThemedText>
                  <Switch
                    value={recImportant}
                    onValueChange={(value) =>
                      handleImportantToggle(value, setRecImportant, () => setRecCalendarExport(false))
                    }
                    trackColor={{ false: theme.border, true: primarySoft }}
                    thumbColor={recImportant ? primary : theme.onBrand}
                  />
                </View>
                {recImportant ? (
                  <View style={styles.toggleRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Agregar a Google Calendar
                    </ThemedText>
                    <Switch
                      value={recCalendarExport}
                      onValueChange={setRecCalendarExport}
                      trackColor={{ false: theme.border, true: primarySoft }}
                      thumbColor={recCalendarExport ? primary : theme.onBrand}
                    />
                  </View>
                ) : null}
                {importantHint ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {importantHint}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}

            {addType === 'Cuota' ? (
              <View style={styles.formStack}>
                <TextInput
                  placeholder="Compra"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={instName}
                  onChangeText={setInstName}
                />
                <TextInput
                  placeholder="Monto por cuota"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={instAmount}
                  onChangeText={setInstAmount}
                  keyboardType="numeric"
                />
                <CurrencySelect
                  value={instCurrency}
                  onChange={setInstCurrency}
                  compact
                  style={styles.inlineCurrency}
                  label=""
                />
                <TextInput
                  placeholder="Cantidad total de cuotas"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={instTotal}
                  onChangeText={setInstTotal}
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Cuota actual (ej. 1)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={instCurrent}
                  onChangeText={setInstCurrent}
                  keyboardType="numeric"
                />
                <Pressable
                  onPress={() => {
                    if (NativeDateTimePicker) {
                      setPickerTarget('instNextDate');
                      setShowPicker(true);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.dateBox,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Próximo vencimiento
                  </ThemedText>
                  <ThemedText type="smallBold">{formatShortDate(toISODate(instNextDate))}</ThemedText>
                </Pressable>
                {Platform.OS === 'web' ? (
                  <TextInput
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                    value={toISODate(instNextDate)}
                    onChangeText={(value) => {
                      const date = new Date(value + 'T00:00:00');
                      if (!Number.isNaN(date.getTime())) {
                        setInstNextDate(date);
                      }
                    }}
                  />
                ) : null}
                <Pressable
                  onPress={() => openSelect('instCategory')}
                  style={({ pressed }) => [
                    styles.selectBox,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Categoría
                  </ThemedText>
                  <ThemedText type="smallBold">{instCategory || 'Seleccionar'}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => openSelect('instMethod')}
                  style={({ pressed }) => [
                    styles.selectBox,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Método
                  </ThemedText>
                  <ThemedText type="smallBold">{instMethod || 'Seleccionar'}</ThemedText>
                </Pressable>
                <View style={styles.toggleRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Marcar como importante
                  </ThemedText>
                  <Switch
                    value={instImportant}
                    onValueChange={(value) =>
                      handleImportantToggle(value, setInstImportant, () => setInstCalendarExport(false))
                    }
                    trackColor={{ false: theme.border, true: primarySoft }}
                    thumbColor={instImportant ? primary : theme.onBrand}
                  />
                </View>
                {instImportant ? (
                  <View style={styles.toggleRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Agregar a Google Calendar
                    </ThemedText>
                    <Switch
                      value={instCalendarExport}
                      onValueChange={setInstCalendarExport}
                      trackColor={{ false: theme.border, true: primarySoft }}
                      thumbColor={instCalendarExport ? primary : theme.onBrand}
                    />
                  </View>
                ) : null}
                {importantHint ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {importantHint}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  resetForms();
                  setShowAdd(false);
                }}
                style={({ pressed }) => [
                  styles.outlineButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: primary },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
                  {isEditing ? 'Guardar cambios' : 'Guardar'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSelect}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSelect(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Seleccionar</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Elegí una opción o agregá una nueva.
              </ThemedText>
            </View>
            <View style={styles.listGap}>
              {optionsForSelect.map((option) => {
                const selected = option === currentSelection();
                return (
                  <SelectableOption
                    key={option}
                    label={option}
                    selected={selected}
                    onPress={() => updateSelection(option)}
                  />
                );
              })}
            </View>
            {addingOption ? (
              <View style={styles.formStack}>
                <TextInput
                  placeholder="Nueva opción"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={newOption}
                  onChangeText={setNewOption}
                />
                <Pressable
                  onPress={handleAddOption}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: primary },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
                    Agregar
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setAddingOption(true)}
                style={({ pressed }) => [
                  styles.outlineButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  + Agregar opción
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              onPress={() => setShowSelect(false)}
              style={({ pressed }) => [
                styles.outlineButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Listo
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {showPicker && NativeDateTimePicker ? (
        <NativeDateTimePicker
          value={
            pickerTarget === 'recNextDate'
              ? recNextDate
              : pickerTarget === 'recEndDate'
                ? recEndDate
                : pickerTarget === 'instNextDate'
                  ? instNextDate
                  : dueDate
          }
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (!date || !pickerTarget) return;
            if (pickerTarget === 'dueDate') {
              setDueDate(date);
            } else if (pickerTarget === 'recNextDate') {
              setRecNextDate(date);
            } else if (pickerTarget === 'recEndDate') {
              setRecEndDate(date);
            } else if (pickerTarget === 'instNextDate') {
              setInstNextDate(date);
            }
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  tabsRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  addButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
  },
  addText: {
    color: '#1f1b18',
  },
  listGap: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  modalCard: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalHeader: {
    gap: Spacing.one,
  },
  formStack: {
    gap: Spacing.two,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  inlineLabel: {
    marginTop: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    fontWeight: '600',
  },
  inlineCurrency: {
    height: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  dateBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  selectBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  modalActions: {
    gap: Spacing.two,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
  },
  outlineButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
});


