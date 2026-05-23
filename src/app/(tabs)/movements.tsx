import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { SelectableOption } from '@/components/ui/selectable-option';
import { CurrencySelect } from '@/components/ui/currency-select';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  calculateTotals,
  endOfWeek,
  formatCurrency,
  formatShortDate,
  formatTime,
  groupByDate,
  hasOtherCurrencies,
  startOfWeek,
  toISODate,
} from '@/lib/finance';
import { useTransactions } from '@/hooks/use-transactions';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useDuo } from '@/hooks/use-duo';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addCategory, getCategories } from '@/lib/categories';
import { addPaymentMethod, BASE_PAYMENT_METHODS, getPaymentMethods } from '@/lib/payment-methods';
import { formatAmountInput, parseAmountInput } from '@/lib/amount-input';
import { Transaction } from '@/lib/types';

const PERIOD_FILTERS = ['Todo', 'Hoy', 'Esta semana', 'Este mes', 'Personalizado'] as const;
const TYPE_FILTERS = ['Todos', 'Entradas', 'Salidas'] as const;

type PeriodFilter = (typeof PERIOD_FILTERS)[number];
type TypeFilter = (typeof TYPE_FILTERS)[number];

type EditType = 'income' | 'expense';

function getNativeDateTimePicker() {
  if (Platform.OS === 'web') {
    return null;
  }
  try {
    return require('@react-native-community/datetimepicker').default;
  } catch {
    return null;
  }
}

export default function MovementsScreen() {
  const theme = useTheme();
  const { state: duoState } = useDuo();
  const isDuo = duoState.activeContext === 'duo';
  const incomeColor = isDuo ? theme.duoAccent : theme.success;
  const expenseColor = isDuo ? (theme.duoAlt ?? theme.text) : theme.accent;
  const primaryAction = isDuo ? theme.duoAccent : theme.brand;
  const primaryActionSoft = isDuo ? (theme.duoSupport ?? theme.duoSoft) : theme.brandSoft;
  const { transactions, refresh, update, remove } = useTransactions();
  const { settings: appSettings } = useAppSettings();
  const params = useLocalSearchParams<{ edit?: string | string[] }>();
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const NativeDateTimePicker = useMemo(() => getNativeDateTimePicker(), []);
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('Todo');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<EditType>('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editCurrency, setEditCurrency] = useState(appSettings.currency);
  const [editCategory, setEditCategory] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editWeekly, setEditWeekly] = useState(false);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editShowPicker, setEditShowPicker] = useState(false);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editMethods, setEditMethods] = useState<string[]>(BASE_PAYMENT_METHODS);
  const [editError, setEditError] = useState('');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    const editParam = Array.isArray(params?.edit) ? params?.edit[0] : params?.edit;
    if (editParam) {
      setPendingEditId(editParam);
    }
  }, [params?.edit]);

  useEffect(() => {
    if (!pendingEditId || editingTx) return;
    const target = transactions.find((tx) => tx.id === pendingEditId);
    if (target) {
      openEdit(target);
      setPendingEditId(null);
      router.setParams({ edit: undefined });
    }
  }, [pendingEditId, transactions, editingTx]);

  useEffect(() => {
    if (editType === 'income') {
      setEditWeekly(false);
    }
  }, [editType]);

  useEffect(() => {
    if (!editingTx) return;
    getCategories().then(setEditCategories);
    getPaymentMethods().then((stored) => {
      const merged = Array.from(new Set([...stored, ...BASE_PAYMENT_METHODS]));
      setEditMethods(merged);
    });
  }, [editingTx]);

  const categoryOptions = useMemo(() => {
    const items = Array.from(new Set(transactions.map((tx) => tx.category).filter(Boolean)));
    return ['Todas', ...items];
  }, [transactions]);

  const filtered = useMemo(() => {
    const today = toISODate(new Date());
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const currentMonth = new Date();
    let next = transactions;

    if (periodFilter === 'Hoy') {
      next = next.filter((tx) => tx.date === today);
    } else if (periodFilter === 'Esta semana') {
      next = next.filter((tx) => {
        const date = new Date(tx.date + 'T00:00:00');
        return date >= weekStart && date <= weekEnd;
      });
    } else if (periodFilter === 'Este mes') {
      next = next.filter((tx) => {
        const date = new Date(tx.date + 'T00:00:00');
        return (
          date.getFullYear() === currentMonth.getFullYear() &&
          date.getMonth() === currentMonth.getMonth()
        );
      });
    } else if (periodFilter === 'Personalizado') {
      if (customStartDate && customEndDate) {
        next = next.filter((tx) => {
          const date = new Date(tx.date + 'T00:00:00');
          return date >= customStartDate && date <= customEndDate;
        });
      }
    }

    if (typeFilter === 'Entradas') {
      next = next.filter((tx) => tx.type === 'income');
    } else if (typeFilter === 'Salidas') {
      next = next.filter((tx) => tx.type === 'expense');
    }

    if (categoryFilter !== 'Todas') {
      next = next.filter((tx) => tx.category === categoryFilter);
    }

    const term = search.trim().toLowerCase();
    if (term) {
      next = next.filter((tx) => {
        const content = `${tx.category} ${tx.method} ${tx.type}`.toLowerCase();
        return content.includes(term);
      });
    }

    return next;
  }, [
    transactions,
    periodFilter,
    typeFilter,
    categoryFilter,
    search,
    customStartDate,
    customEndDate,
  ]);

const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const summary = useMemo(() => {
    const totals = calculateTotals(filtered, appSettings.currency);
    const balance = totals.income - totals.expense - totals.savingsManual;
    return { ...totals, balance };
  }, [filtered, appSettings.currency]);

  const hasOtherCurrencyTransactions = useMemo(
    () => hasOtherCurrencies(filtered, appSettings.currency),
    [filtered, appSettings.currency]
  );

  const handleExport = () => {
    Alert.alert(
      'Exportar resumen',
      'Estamos preparando la exportación. Este resumen se generará en la siguiente versión.'
    );
  };

  const openEdit = (tx: Transaction) => {
    setEditError('');
    setEditingTx(tx);
    setEditType(tx.type);
    setEditAmount(formatAmountInput(String(tx.amount)));
    setEditCurrency(tx.currency || appSettings.currency);
    setEditCategory(tx.category);
    setEditMethod(tx.method);
    setEditNote(tx.note ?? '');
    setEditDate(new Date(tx.date + 'T00:00:00'));
    setEditWeekly(Boolean(tx.weekly));
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const value = parseAmountInput(editAmount);
    if (!value || Number.isNaN(value) || value <= 0) {
      setEditError('Ingresá un monto válido.');
      return;
    }
    if (!editCategory.trim()) {
      setEditError('Seleccioná una categoría.');
      return;
    }
    if (!editMethod.trim()) {
      setEditError('Seleccioná un método.');
      return;
    }
    if (editType === 'income' && editCategory.trim() === 'Ahorro') {
      setEditError('Ahorro no es una categoría válida para ingresos.');
      return;
    }

    try {
      const previousCategory = editingTx.category;
      const previousMethod = editingTx.method;
      const updated = await update(editingTx.id, {
        type: editType,
        amount: value,
        currency: editCurrency,
        category: editCategory.trim(),
        method: editMethod.trim(),
        date: toISODate(editDate),
        note: editNote.trim() ? editNote.trim() : undefined,
        weekly: editType === 'expense' ? editWeekly : false,
      });
      if (!updated) {
        setEditError('No pudimos guardar este movimiento. Probá de nuevo.');
        return;
      }
      if (editCategory.trim() && editCategory.trim() !== previousCategory) {
        await addCategory(editCategory.trim());
      }
      if (editMethod.trim() && editMethod.trim() !== previousMethod) {
        await addPaymentMethod(editMethod.trim());
      }
      setEditingTx(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos guardar este movimiento.';
      setEditError(message);
    }
  };

  const handleDelete = async () => {
    if (!editingTx) return;
    Alert.alert('Eliminar movimiento', '¿Querés eliminar este movimiento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const ok = await remove(editingTx.id);
          if (!ok) {
            Alert.alert('No pudimos eliminar', 'No se pudo borrar el movimiento. Revisá tu conexión.');
            return;
          }
          setEditingTx(null);
        },
      },
    ]);
  };

  const editCategoryOptions = useMemo(() => {
    const base = editCategories.length ? editCategories : ['Comida', 'Transporte', 'Hogar', 'Servicios', 'Ocio', 'Salud', 'Ahorro'];
    return editType === 'income' ? base.filter((item) => item !== 'Ahorro') : base;
  }, [editCategories, editType]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="subtitle">Movimientos</ThemedText>
          <ThemeToggle />
        </View>
        <ThemedText themeColor="textSecondary">
          Todo lo que pasó, ordenado y fácil de leer.
        </ThemedText>
      </View>

      <Card variant="soft" style={styles.searchCard}>
        <SectionHeader title="Buscar" />
        <View style={styles.searchRow}>
          <TextInput
            placeholder="Buscar por nombre, categoría o método"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text, borderColor: theme.border }]}
            value={search}
            onChangeText={setSearch}
          />
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => [
              styles.filterButton,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Filtros
            </ThemedText>
          </Pressable>
        </View>
      </Card>

<Card>
        <SectionHeader title="Resumen del período" />
        <View style={styles.summaryRow}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Entradas
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: incomeColor }}>
              {formatCurrency(summary.income, appSettings.currency)}
            </ThemedText>
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Salidas
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: expenseColor }}>
              {formatCurrency(summary.expense, appSettings.currency)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Ahorro
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.success }}>
              {formatCurrency(summary.savingsManual, appSettings.currency)}
            </ThemedText>
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Balance
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: summary.balance >= 0 ? incomeColor : expenseColor }}>
              {formatCurrency(summary.balance, appSettings.currency)}
            </ThemedText>
          </View>
        </View>
        {hasOtherCurrencyTransactions ? (
          <ThemedText type="small" themeColor="textSecondary">
            Totales calculados en {appSettings.currency}. Hay movimientos en otras monedas.
          </ThemedText>
        ) : null}
        <Pressable
          onPress={handleExport}
          style={({ pressed }) => [
            styles.exportButton,
            { borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Exportar resumen
          </ThemedText>
        </Pressable>
      </Card>

      <ThemedText type="small" themeColor="textSecondary" style={styles.editHint}>
        Tocá un movimiento para editarlo
      </ThemedText>

      {filtered.length === 0 ? (
        <Card>
          <ThemedText type="smallBold">Sin movimientos para este filtro</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Probá con otro filtro o registrá un nuevo movimiento.
          </ThemedText>
        </Card>
      ) : (
        groups.map((group) => {
          const total = group.items.reduce((acc, item) => {
            return item.type === 'income' ? acc + item.amount : acc - item.amount;
          }, 0);

          return (
            <Card key={group.date}>
              <View style={styles.groupHeader}>
                <SectionHeader title={formatShortDate(group.date)} />
                <ThemedText
                  type="smallBold"
                  style={{ color: total >= 0 ? incomeColor : expenseColor }}>
                  {formatCurrency(total)}
                </ThemedText>
              </View>
              <View style={styles.listGap}>
                {group.items.map((item) => {
                  const isIncome = item.type === 'income';
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => openEdit(item)}
                      style={({ pressed }) => [styles.itemRow, pressed && styles.pressed]}>
                      <View style={styles.itemInfo}>
                        <ThemedText type="smallBold">{item.category}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.method} · {formatShortDate(item.date)} · {formatTime(item.createdAt)}
                        </ThemedText>
                        {item.system === 'savings-renewal' ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            Ahorro programado
                          </ThemedText>
                        ) : null}
                      </View>
                      <View style={styles.itemAmount}>
                        <ThemedText
                          type="smallBold"
                          style={{ color: isIncome ? incomeColor : expenseColor }}>
                          {isIncome ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                        </ThemedText>
                        {item.currency !== appSettings.currency ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {item.currency}
                          </ThemedText>
                        ) : null}
                        <ThemedText type="small" themeColor="textSecondary">
                          {isIncome ? 'Entrada' : 'Salida'}
                        </ThemedText>
                      </View>
                      <Feather name="chevron-right" size={18} color={theme.textSecondary} />
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        })
      )}

      <Modal
        visible={!!editingTx}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingTx(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <ThemedText type="subtitle">Editar movimiento</ThemedText>
                  <Pressable onPress={() => setEditingTx(null)} hitSlop={8}>
                    <Feather name="x" size={18} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  Ajustá los datos y guardá los cambios.
                </ThemedText>
              </View>

              <View style={styles.editBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  Tipo
                </ThemedText>
                <View style={styles.filters}>
                  <SelectableOption
                    label="Ingreso"
                    selected={editType === 'income'}
                    onPress={() => setEditType('income')}
                  />
                  <SelectableOption
                    label="Egreso"
                    selected={editType === 'expense'}
                    onPress={() => setEditType('expense')}
                  />
                </View>
              </View>

              <View style={styles.editBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  Monto
                </ThemedText>
                <View style={styles.amountRow}>
                  <TextInput
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.amountInput, { color: theme.text, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={editAmount}
                    onChangeText={(value) => setEditAmount(formatAmountInput(value))}
                  />
                  <CurrencySelect
                    value={editCurrency}
                    onChange={setEditCurrency}
                    label=""
                    compact
                    style={styles.currencyPicker}
                  />
                </View>
              </View>

              <View style={styles.editBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  Categoría
                </ThemedText>
                <View style={styles.filters}>
                  {editCategoryOptions.map((item) => (
                    <SelectableOption
                      key={item}
                      label={item}
                      selected={editCategory === item}
                      onPress={() => setEditCategory(item)}
                    />
                  ))}
                </View>
                <TextInput
                  placeholder="Otra categoría"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={editCategory}
                  onChangeText={setEditCategory}
                />
              </View>

              <View style={styles.editBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  Método
                </ThemedText>
                <View style={styles.filters}>
                  {editMethods.map((item) => (
                    <SelectableOption
                      key={item}
                      label={item}
                      selected={editMethod === item}
                      onPress={() => setEditMethod(item)}
                    />
                  ))}
                </View>
                <TextInput
                  placeholder="Otro método"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={editMethod}
                  onChangeText={setEditMethod}
                />
              </View>

              <View style={styles.editBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  Fecha
                </ThemedText>
                <Pressable
                  onPress={() => {
                    if (NativeDateTimePicker) {
                      setEditShowPicker(true);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.dateSelect,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Fecha seleccionada
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.dateValue}>
                    {formatShortDate(toISODate(editDate))}
                  </ThemedText>
                </Pressable>
                {editShowPicker && NativeDateTimePicker ? (
                  <NativeDateTimePicker
                    value={editDate}
                    mode="date"
                    display="default"
                    onChange={(_, date) => {
                      setEditShowPicker(false);
                      if (!date) return;
                      setEditDate(date);
                    }}
                  />
                ) : null}
              </View>

              {editType === 'expense' ? (
                <View style={styles.editBlock}>
                  <View style={styles.toggleRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Usar disponible semanal
                    </ThemedText>
                    <Switch
                      value={editWeekly}
                      onValueChange={setEditWeekly}
                      trackColor={{ false: theme.border, true: primaryActionSoft }}
                      thumbColor={editWeekly ? primaryAction : theme.onBrand}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Este gasto se descuenta de la bolsa semanal.
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.editBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  Nota
                </ThemedText>
                <TextInput
                  placeholder="Opcional"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  value={editNote}
                  onChangeText={setEditNote}
                />
              </View>

              {editError ? (
                <ThemedText type="small" style={{ color: expenseColor }}>
                  {editError}
                </ThemedText>
              ) : null}

              <View style={styles.modalActionsRow}>
                <Pressable
                  onPress={() => setEditingTx(null)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Cancelar
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => [
                    styles.dangerButton,
                    { borderColor: expenseColor },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: expenseColor }}>
                    Eliminar
                  </ThemedText>
                </Pressable>
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={handleSaveEdit}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { backgroundColor: primaryAction },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                    Guardar cambios
                  </ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={filtersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Filtros</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ajustá el período y tipo de movimientos.
              </ThemedText>
            </View>

            <View style={styles.filterBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                Período
              </ThemedText>
              <View style={styles.filters}>
                {PERIOD_FILTERS.map((item) => (
                  <SelectableOption
                    key={item}
                    label={item}
                    selected={periodFilter === item}
                    onPress={() => setPeriodFilter(item)}
                  />
                ))}
              </View>
              {periodFilter === 'Personalizado' ? (
                <View style={styles.customRange}>
                  <View style={styles.rangeRow}>
                    <Pressable
                      onPress={() => {
                        if (NativeDateTimePicker) {
                          setPickerTarget('start');
                          setShowPicker(true);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.dateBox,
                        { borderColor: theme.border, backgroundColor: theme.card },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Desde
                      </ThemedText>
                      <ThemedText type="smallBold">
                        {customStartDate ? formatShortDate(toISODate(customStartDate)) : 'Elegir'}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (NativeDateTimePicker) {
                          setPickerTarget('end');
                          setShowPicker(true);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.dateBox,
                        { borderColor: theme.border, backgroundColor: theme.card },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Hasta
                      </ThemedText>
                      <ThemedText type="smallBold">
                        {customEndDate ? formatShortDate(toISODate(customEndDate)) : 'Elegir'}
                      </ThemedText>
                    </Pressable>
                  </View>
                  {Platform.OS === 'web' ? (
                    <View style={styles.webInputs}>
                      <TextInput
                        placeholder="Desde (AAAA-MM-DD)"
                        placeholderTextColor={theme.textSecondary}
                        style={[styles.searchInput, { color: theme.text, borderColor: theme.border }]}
                        value={customStartDate ? toISODate(customStartDate) : ''}
                        onChangeText={(value) => {
                          const date = new Date(value + 'T00:00:00');
                          if (!Number.isNaN(date.getTime())) {
                            setCustomStartDate(date);
                          }
                        }}
                      />
                      <TextInput
                        placeholder="Hasta (AAAA-MM-DD)"
                        placeholderTextColor={theme.textSecondary}
                        style={[styles.searchInput, { color: theme.text, borderColor: theme.border }]}
                        value={customEndDate ? toISODate(customEndDate) : ''}
                        onChangeText={(value) => {
                          const date = new Date(value + 'T00:00:00');
                          if (!Number.isNaN(date.getTime())) {
                            setCustomEndDate(date);
                          }
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <View style={styles.filterBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                Tipo
              </ThemedText>
              <View style={styles.filters}>
                {TYPE_FILTERS.map((item) => (
                  <SelectableOption
                    key={item}
                    label={item}
                    selected={typeFilter === item}
                    onPress={() => setTypeFilter(item)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.filterBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                Categoría
              </ThemedText>
              <View style={styles.filters}>
                {categoryOptions.map((item) => (
                  <SelectableOption
                    key={item}
                    label={item}
                    selected={categoryFilter === item}
                    onPress={() => setCategoryFilter(item)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setPeriodFilter('Todo');
                  setTypeFilter('Todos');
                  setCategoryFilter('Todas');
                  setCustomStartDate(null);
                  setCustomEndDate(null);
                }}
                style={({ pressed }) => [
                  styles.outlineButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Borrar filtros
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setFiltersOpen(false)}
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: primaryAction },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
                  Listo
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {showPicker && NativeDateTimePicker ? (
        <NativeDateTimePicker
          value={
            pickerTarget === 'end' && customEndDate
              ? customEndDate
              : customStartDate ?? new Date()
          }
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (!date || !pickerTarget) return;
            if (pickerTarget === 'start') {
              setCustomStartDate(date);
            } else {
              setCustomEndDate(date);
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
  editHint: {
    marginTop: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  searchCard: {
    gap: Spacing.two,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 40,
  },
  filterButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  filterBlock: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  editBlock: {
    marginTop: Spacing.two,
    gap: Spacing.one,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  customRange: {
    gap: Spacing.two,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  dateSelect: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    justifyContent: 'center',
    gap: 4,
  },
  dateValue: {
    marginTop: 2,
  },
  webInputs: {
    gap: Spacing.two,
  },
  filters: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  exportButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listGap: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemAmount: {
    alignItems: 'flex-end',
    gap: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  modalCard: {
    borderRadius: 20,
    padding: Spacing.three,
    maxHeight: '90%',
  },
  modalContent: {
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  modalHeader: {
    gap: Spacing.one,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  modalActions: {
    gap: Spacing.two,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  dangerButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  outlineButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  closeButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.one + 1,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 38,
  },
  currencyPicker: {
    height: 40,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.one + 1,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontWeight: '600',
  },
  closeText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.85,
  },
});



