import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { CurrencySelect } from '@/components/ui/currency-select';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectableOption } from '@/components/ui/selectable-option';
import { paymentMethods as defaultPaymentMethods } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';
import { formatShortDate, toISODate } from '@/lib/finance';
import { addPaymentMethod, getPaymentMethods } from '@/lib/payment-methods';
import { addCategory, getCategories } from '@/lib/categories';
import { addTransaction as addStoredTransaction } from '@/lib/transactions';
import { Transaction } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';
import { useAppSettings } from '@/hooks/use-app-settings';

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

const EXPENSE_CATEGORIES = ['Comida', 'Transporte', 'Hogar', 'Servicios', 'Ocio', 'Salud', 'Ahorro'];
const INCOME_CATEGORIES = ['Sueldo', 'Freelance', 'Ventas', 'Intereses', 'Otros'];
const DATE_OPTIONS = ['Hoy', 'Ayer', 'Elegir fecha'] as const;

type DateOption = (typeof DATE_OPTIONS)[number];
type TransactionKind = 'expense' | 'income';

export default function AddTransactionScreen() {
  const NativeDateTimePicker = useMemo(() => getNativeDateTimePicker(), []);
  const [type, setType] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(EXPENSE_CATEGORIES);
  const [methods, setMethods] = useState<string[]>(defaultPaymentMethods);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [customMethod, setCustomMethod] = useState('');
  const [useCustomMethod, setUseCustomMethod] = useState(false);
  const [dateOption, setDateOption] = useState<DateOption>('Hoy');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [useWeekly, setUseWeekly] = useState(false);
  const theme = useTheme();
  const { settings: appSettings } = useAppSettings();
  const [currency, setCurrency] = useState(appSettings.currency);

  useEffect(() => {
    let mounted = true;
    const loadMethods = async () => {
      const stored = await getPaymentMethods();
      if (!mounted) return;
      const merged = Array.from(new Set([...stored, ...defaultPaymentMethods]));
      setMethods(merged);
    };
    loadMethods();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrency(appSettings.currency);
  }, [appSettings.currency]);

  useFocusEffect(
    React.useCallback(() => {
      getPaymentMethods().then((stored) => {
        const merged = Array.from(new Set([...stored, ...defaultPaymentMethods]));
        setMethods(merged);
      });
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      getCategories().then(setExpenseCategories);
    }, [])
  );

  const categories = useMemo(() => {
    return type === 'income' ? INCOME_CATEGORIES : expenseCategories;
  }, [expenseCategories, type]);

  useEffect(() => {
    if (type === 'income' && selectedCategory === 'Ahorro') {
      setSelectedCategory('');
      setUseCustomCategory(false);
    }
  }, [type, selectedCategory]);

  useEffect(() => {
    if (type === 'income') {
      setUseWeekly(false);
    }
  }, [type]);

  const handleDateSelect = (option: DateOption) => {
    setDateOption(option);
    if (option === 'Hoy') {
      setSelectedDate(new Date());
    }
    if (option === 'Ayer') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setSelectedDate(yesterday);
    }
    if (option === 'Elegir fecha') {
      if (Platform.OS === 'web') {
        return;
      }
      setShowPicker(true);
    }
  };

  const handleSave = async () => {
    const normalized = amount.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const value = Number(normalized);
    const category = useCustomCategory ? customCategory.trim() : selectedCategory;
    const method = useCustomMethod ? customMethod.trim() : selectedMethod;

    if (!value || Number.isNaN(value) || value <= 0) {
      setError('Ingresá un monto válido.');
      return;
    }
    if (!category) {
      setError('Seleccioná o escribí una categoría.');
      return;
    }
    if (!method) {
      setError('Seleccioná o escribí un método de pago.');
      return;
    }
    if (type === 'income' && category === 'Ahorro') {
      setError('Ahorro no es una categoría válida para ingresos.');
      return;
    }

    if (useCustomMethod && method) {
      const updated = await addPaymentMethod(method);
      const merged = Array.from(new Set([...updated, ...defaultPaymentMethods]));
      setMethods(merged);
      setSelectedMethod(method);
      setUseCustomMethod(false);
    }

    if (useCustomCategory && category) {
      const nextCategories = await addCategory(category);
      setExpenseCategories(nextCategories);
      setSelectedCategory(category);
      setUseCustomCategory(false);
    }

    const now = new Date().toISOString();
    const transaction: Transaction = {
      id: String(Date.now()),
      type,
      amount: value,
      currency,
      category,
      date: toISODate(selectedDate),
      method,
      note: note.trim() ? note.trim() : undefined,
      weekly: type === 'expense' ? useWeekly : false,
      createdAt: now,
    };

    await addStoredTransaction(transaction, { weekly: type === 'expense' ? useWeekly : false });
    setError('');
    router.back();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Nuevo movimiento</ThemedText>
        <ThemedText themeColor="textSecondary">
          Cargá un egreso o ingreso y seguí tu día en segundos.
        </ThemedText>
      </View>

      <View style={styles.segmented}>
        <SelectableOption
          label="Egreso"
          description="Salida de dinero"
          selected={type === 'expense'}
          size="card"
          onPress={() => setType('expense')}
        />
        <SelectableOption
          label="Ingreso"
          description="Entrada de dinero"
          selected={type === 'income'}
          size="card"
          onPress={() => setType('income')}
        />
      </View>

      <Card style={styles.amountCard}>
        <SectionHeader title="Monto" />
        <View style={styles.amountRow}>
          <ThemedText type="subtitle" style={styles.currency}>
            {currency}
          </ThemedText>
          <TextInput
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            style={[styles.amountInput, { color: theme.text }]}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <CurrencySelect
            value={currency}
            onChange={setCurrency}
            label=""
            compact
            style={styles.currencyPicker}
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Tip: podés escribir solo números.
        </ThemedText>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Categorías" />
        <View style={styles.chips}>
          {categories.map((category) => {
            const selected = selectedCategory === category && !useCustomCategory;
            return (
              <SelectableOption
                key={category}
                label={category}
                selected={selected}
                onPress={() => {
                  setUseCustomCategory(false);
                  setSelectedCategory(category);
                }}
              />
            );
          })}
          <SelectableOption
            label="Agregar categoría"
            selected={useCustomCategory}
            onPress={() => {
              setUseCustomCategory(true);
              setSelectedCategory('');
            }}
          />
        </View>
        {useCustomCategory ? (
          <TextInput
            placeholder="Escribí una categoría"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={customCategory}
            onChangeText={setCustomCategory}
          />
        ) : null}
      </Card>

      <Card>
        <SectionHeader title="Fecha" />
        <View style={styles.chipsCompact}>
          {DATE_OPTIONS.map((option) => (
            <SelectableOption
              key={option}
              label={option}
              selected={dateOption === option}
              onPress={() => handleDateSelect(option)}
            />
          ))}
        </View>
        <Pressable
          style={[styles.dateBox, { borderColor: theme.border, backgroundColor: theme.card }]}
          onPress={() => {
            if (dateOption === 'Elegir fecha' && NativeDateTimePicker) {
              setShowPicker(true);
            }
          }}>
          <ThemedText type="small" themeColor="textSecondary">
            Fecha seleccionada
          </ThemedText>
          <ThemedText type="smallBold">
            {formatShortDate(toISODate(selectedDate))}
          </ThemedText>
        </Pressable>
        {Platform.OS === 'web' && dateOption === 'Elegir fecha' ? (
          <TextInput
            placeholder="AAAA-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={toISODate(selectedDate)}
            onChangeText={(value) => {
              const date = new Date(value + 'T00:00:00');
              if (!Number.isNaN(date.getTime())) {
                setSelectedDate(date);
              }
            }}
          />
        ) : null}
      </Card>

      <Card variant="soft">
        <SectionHeader title="Método" />
        <View style={styles.chipsCompact}>
          {methods.map((method) => (
            <SelectableOption
              key={method}
              label={method}
              selected={selectedMethod === method && !useCustomMethod}
              onPress={() => {
                setUseCustomMethod(false);
                setSelectedMethod(method);
              }}
            />
          ))}
          <SelectableOption
            label="+ Agregar método"
            selected={useCustomMethod}
            onPress={() => {
              setUseCustomMethod(true);
              setSelectedMethod('');
            }}
          />
        </View>
        {useCustomMethod ? (
          <TextInput
            placeholder="Escribí un método de pago"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={customMethod}
            onChangeText={(value) => {
              setCustomMethod(value);
              setSelectedMethod(value);
            }}
          />
        ) : null}
      </Card>

      {type === 'expense' ? (
        <Card variant="soft">
          <SectionHeader title="Disponible semanal" />
          <View style={styles.toggleRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Usar disponible semanal
            </ThemedText>
            <Switch
              value={useWeekly}
              onValueChange={setUseWeekly}
              trackColor={{ false: theme.border, true: theme.brandSoft }}
              thumbColor={useWeekly ? theme.brand : theme.onBrand}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Este gasto se descuenta de la bolsa semanal y no del mensual.
          </ThemedText>
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="Nota (opcional)" />
        <TextInput
          placeholder="Agregá un detalle si lo necesitás"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={note}
          onChangeText={setNote}
        />
      </Card>

      {error ? (
        <ThemedText type="small" style={[styles.errorText, { color: theme.accent }]}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        onPress={handleSave}
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: theme.brand },
          pressed && styles.buttonPressed,
        ]}>
        <ThemedText type="smallBold" style={[styles.saveText, { color: theme.onBrand }]}>
          Guardar movimiento
        </ThemedText>
      </Pressable>

      {showPicker && NativeDateTimePicker ? (
        <NativeDateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) {
              setSelectedDate(date);
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
  segmented: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  amountCard: {
    gap: Spacing.two,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  currency: {
    fontSize: 18,
    minWidth: 44,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: 700,
  },
  currencyPicker: {
    height: 44,
    justifyContent: 'center',
  },
  chips: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chipsCompact: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  input: {
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: 600,
  },
  dateBox: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  errorText: {
    marginTop: Spacing.one,
  },
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  saveText: {
    color: '#ffffff',
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.9,
  },
});
