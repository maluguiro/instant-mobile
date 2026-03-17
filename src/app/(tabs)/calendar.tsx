
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectableOption } from '@/components/ui/selectable-option';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, formatShortDate, toISODate } from '@/lib/finance';
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
  saveDueDates,
  saveInstallments,
  saveRecurringPayments,
} from '@/lib/calendar';
import { addCategory, getCategories } from '@/lib/categories';
import { paymentMethods as defaultPaymentMethods } from '@/constants/mock-data';
import { addPaymentMethod, getPaymentMethods } from '@/lib/payment-methods';

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

export default function CalendarScreen() {
  const theme = useTheme();
  const NativeDateTimePicker = useMemo(() => getNativeDateTimePicker(), []);

  const [activeTab, setActiveTab] = useState<Tab>('Próximos vencimientos');
  const [dueDates, setDueDates] = useState<DueDate[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [categories, setCategories] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>(defaultPaymentMethods);

  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<AddType>('Pago único');
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
  const [dueCategory, setDueCategory] = useState('');
  const [dueMethod, setDueMethod] = useState('');
  const [dueNote, setDueNote] = useState('');

  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('monthly');
  const [recEveryDays, setRecEveryDays] = useState('30');
  const [recNextDate, setRecNextDate] = useState<Date>(new Date());
  const [recCategory, setRecCategory] = useState('');
  const [recMethod, setRecMethod] = useState('');
  const [recDurationType, setRecDurationType] = useState<DurationType>('indefinite');
  const [recDurationMonths, setRecDurationMonths] = useState('6');
  const [recEndDate, setRecEndDate] = useState<Date>(new Date());

  const [instName, setInstName] = useState('');
  const [instAmount, setInstAmount] = useState('');
  const [instTotal, setInstTotal] = useState('');
  const [instCurrent, setInstCurrent] = useState('');
  const [instNextDate, setInstNextDate] = useState<Date>(new Date());
  const [instCategory, setInstCategory] = useState('');
  const [instMethod, setInstMethod] = useState('');

  useFocusEffect(
    useCallback(() => {
      Promise.all([getDueDates(), getRecurringPayments(), getInstallments(), getCategories(), getPaymentMethods()]).then(
        ([due, rec, inst, cats, storedMethods]) => {
          setDueDates(due);
          setRecurring(rec);
          setInstallments(inst);
          setCategories(cats);
          setMethods(Array.from(new Set([...storedMethods, ...defaultPaymentMethods])));
        }
      );
    }, [])
  );

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
      date: item.date,
    }));
    const recItems = activeRecurring.map((item) => ({
      key: `rec-${item.id}`,
      source: 'rec' as const,
      id: item.id,
      name: item.name,
      amount: item.amount,
      date: item.nextDate,
    }));
    const instItems = activeInstallments.map((item) => ({
      key: `inst-${item.id}`,
      source: 'inst' as const,
      id: item.id,
      name: item.name,
      amount: item.amount,
      date: item.nextDate,
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
    const defaultType =
      activeTab === 'Cuotas' ? 'Cuota' : activeTab === 'Recurrentes' ? 'Recurrente' : 'Pago único';
    setAddType(defaultType);
    setShowAdd(true);
  };

  const resetForms = () => {
    setDueName('');
    setDueAmount('');
    setDueDate(new Date());
    setDueCategory('');
    setDueMethod('');
    setDueNote('');

    setRecName('');
    setRecAmount('');
    setRecFrequency('monthly');
    setRecEveryDays('30');
    setRecNextDate(new Date());
    setRecCategory('');
    setRecMethod('');
    setRecDurationType('indefinite');
    setRecDurationMonths('6');
    setRecEndDate(new Date());

    setInstName('');
    setInstAmount('');
    setInstTotal('');
    setInstCurrent('');
    setInstNextDate(new Date());
    setInstCategory('');
    setInstMethod('');

    setNewOption('');
    setAddingOption(false);
  };

  const handleSave = async () => {
    if (addType === 'Pago único') {
      const name = dueName.trim();
      const amount = parseAmount(dueAmount);
      if (!name || !amount) {
        Alert.alert('Completá el vencimiento', 'Agregá un nombre y un monto válido.');
        return;
      }
      const item: DueDate = {
        id: String(Date.now()),
        name,
        amount,
        date: toISODate(dueDate),
        category: dueCategory || undefined,
        method: dueMethod || undefined,
        note: dueNote.trim() || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const next = await addDueDate(item);
      setDueDates(next);
    }

    if (addType === 'Recurrente') {
      const name = recName.trim();
      const amount = parseAmount(recAmount);
      if (!name || !amount) {
        Alert.alert('Completá la recurrencia', 'Agregá un nombre y un monto válido.');
        return;
      }
      const item: RecurringPayment = {
        id: String(Date.now()),
        name,
        amount,
        frequency: recFrequency,
        everyDays: recFrequency === 'everyX' ? Math.max(parseAmount(recEveryDays), 1) : undefined,
        nextDate: toISODate(recNextDate),
        durationType: recDurationType,
        durationMonths: recDurationType === 'months' ? Math.max(parseAmount(recDurationMonths), 1) : undefined,
        endDate: recDurationType === 'until' ? toISODate(recEndDate) : undefined,
        category: recCategory || undefined,
        method: recMethod || undefined,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      const next = await addRecurringPayment(item);
      setRecurring(next);
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
      const item: Installment = {
        id: String(Date.now()),
        name,
        amount,
        total,
        current: Math.min(current, total),
        nextDate: toISODate(instNextDate),
        category: instCategory || undefined,
        method: instMethod || undefined,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      const next = await addInstallment(item);
      setInstallments(next);
    }

    resetForms();
    setShowAdd(false);
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
      setMethods(Array.from(new Set([...updated, ...defaultPaymentMethods])));
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
    const next = dueDates.map((item) => (item.id === id ? { ...item, status: 'paid' } : item));
    await saveDueDates(next);
    setDueDates(next);
  };

  const updateRecurringStatus = async (id: string, status: 'active' | 'paused' | 'ended') => {
    const next = recurring.map((item) => (item.id === id ? { ...item, status } : item));
    await saveRecurringPayments(next);
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
    await saveInstallments(next);
    setInstallments(next);
    const updated = next.find((item) => item.id === id);
    if (updated && updated.status === 'completed') {
      Alert.alert('Cuota completada', 'Esta cuota quedó finalizada.');
    } else {
      Alert.alert('Pago registrado', 'La cuota se registró correctamente.');
    }
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
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.addText}>
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
                  remaining <= 0 ? theme.accent : remaining <= 3 ? theme.warning : theme.textSecondary;
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
                      <ThemedText type="smallBold">{item.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {dateLabel}: {formatShortDate(item.date)} · {typeLabel}
                      </ThemedText>
                      {item.source === 'due' ? (
                        <View style={styles.actionRow}>
                          <Pressable onPress={() => handleMarkDuePaid(item.id)} style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: theme.brand }}>
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
                      <ThemedText type="smallBold">{formatCurrency(item.amount)}</ThemedText>
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
                      <ThemedText type="smallBold">{item.name}</ThemedText>
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
                            onPress={() => updateRecurringStatus(item.id, 'paused')}
                            style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: theme.brand }}>
                              Pausar
                            </ThemedText>
                          </Pressable>
                        ) : item.status === 'paused' ? (
                          <Pressable
                            onPress={() => updateRecurringStatus(item.id, 'active')}
                            style={styles.actionButton}>
                            <ThemedText type="small" style={{ color: theme.brand }}>
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
                      <ThemedText type="smallBold">{formatCurrency(item.amount)}</ThemedText>
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
                    <ThemedText type="smallBold">{item.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Cuota actual: {item.current}/{item.total} · Próxima cuota: {formatShortDate(item.nextDate)}
                    </ThemedText>
                    <View style={styles.actionRow}>
                      <Pressable onPress={() => handleRegisterInstallment(item.id)} style={styles.actionButton}>
                        <ThemedText type="small" style={{ color: theme.brand }}>
                          Registrar cuota
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
                    <ThemedText type="smallBold">{formatCurrency(item.amount)}</ThemedText>
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
              <ThemedText type="subtitle">Nuevo registro</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Elegí qué tipo de pago querés cargar.
              </ThemedText>
            </View>

            <View style={styles.tabsRow}>
              {ADD_TYPES.map((type) => (
                <SelectableOption
                  key={type}
                  label={type}
                  selected={addType === type}
                  onPress={() => setAddType(type)}
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
                  { backgroundColor: theme.brand },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.primaryText}>
                  Guardar
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
                    { backgroundColor: theme.brand },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={styles.primaryText}>
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
