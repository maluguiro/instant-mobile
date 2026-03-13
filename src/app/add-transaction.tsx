import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { paymentMethods } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';
import { formatShortDate, toISODate } from '@/lib/finance';
import { addTransaction as addStoredTransaction } from '@/lib/transactions';
import { Transaction } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

const EXPENSE_CATEGORIES = ['Comida', 'Transporte', 'Hogar', 'Servicios', 'Ocio', 'Salud', 'Ahorro'];
const INCOME_CATEGORIES = ['Sueldo', 'Freelance', 'Ventas', 'Intereses', 'Otros'];
const DATE_OPTIONS = ['Hoy', 'Ayer', 'Elegir fecha'] as const;

type DateOption = (typeof DATE_OPTIONS)[number];

type TransactionKind = 'expense' | 'income';

export default function AddTransactionScreen() {
  const [type, setType] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [dateOption, setDateOption] = useState<DateOption>('Hoy');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();

  const categories = useMemo(() => {
    return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
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

    if (!value || Number.isNaN(value) || value <= 0) {
      setError('Ingresá un monto válido.');
      return;
    }
    if (!category) {
      setError('Seleccioná o escribí una categoría.');
      return;
    }
    if (!selectedMethod) {
      setError('Seleccioná un método de pago.');
      return;
    }

    const now = new Date().toISOString();
    const transaction: Transaction = {
      id: String(Date.now()),
      type,
      amount: value,
      category,
      date: toISODate(selectedDate),
      method: selectedMethod,
      createdAt: now,
    };

    await addStoredTransaction(transaction);
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
        {([
          { key: 'expense', label: 'Egreso', hint: 'Salida de dinero' },
          { key: 'income', label: 'Ingreso', hint: 'Entrada de dinero' },
        ] as const).map((option) => {
          const isActive = type === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setType(option.key)}
              style={[
                styles.segmentButton,
                {
                  backgroundColor: isActive ? theme.brandSoft : theme.backgroundElement,
                  borderColor: isActive ? theme.accent : theme.border,
                },
              ]}>
              <ThemedText type="smallBold">{option.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {option.hint}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.amountCard}>
        <SectionHeader title="Monto" />
        <View style={styles.amountRow}>
          <ThemedText type="subtitle" style={styles.currency}>
            $
          </ThemedText>
          <TextInput
            placeholder="0"
            placeholderTextColor={theme.textSecondary}
            style={[styles.amountInput, { color: theme.text }]}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
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
              <Pressable
                key={category}
                onPress={() => {
                  setUseCustomCategory(false);
                  setSelectedCategory(category);
                }}
                style={({ pressed }) => [pressed && styles.pillPressed]}>
                <Pill
                  label={category}
                  tone={selected ? 'accent' : 'default'}
                  style={selected ? styles.pillSelected : undefined}
                />
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => {
              setUseCustomCategory(true);
              setSelectedCategory('');
            }}
            style={({ pressed }) => [pressed && styles.pillPressed]}>
            <Pill label="Agregar categoría" tone={useCustomCategory ? 'accent' : 'default'} />
          </Pressable>
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
            <Pressable key={option} onPress={() => handleDateSelect(option)}>
              <Pill label={option} tone={dateOption === option ? 'accent' : 'default'} />
            </Pressable>
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {dateOption === 'Elegir fecha'
            ? `Seleccionada: ${formatShortDate(toISODate(selectedDate))}`
            : `Seleccionada: ${formatShortDate(toISODate(selectedDate))}`}
        </ThemedText>
        {Platform.OS === 'web' && dateOption === 'Elegir fecha' ? (
          <TextInput
            placeholder="AAAA-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            value={toISODate(selectedDate)}
            onChangeText={(value) => {
              const parts = value.split('-');
              if (parts.length === 3) {
                const date = new Date(value + 'T00:00:00');
                if (!Number.isNaN(date.getTime())) {
                  setSelectedDate(date);
                }
              }
            }}
          />
        ) : null}
      </Card>

      <Card variant="soft">
        <SectionHeader title="Método" />
        <View style={styles.chipsCompact}>
          {paymentMethods.map((method) => {
            const selected = selectedMethod === method;
            return (
              <Pressable
                key={method}
                onPress={() => setSelectedMethod(method)}
                style={({ pressed }) => [pressed && styles.pillPressed]}>
                <Pill
                  label={method}
                  tone={selected ? 'accent' : 'default'}
                  style={selected ? styles.pillSelected : undefined}
                />
              </Pressable>
            );
          })}
        </View>
      </Card>

      {error ? (
        <ThemedText type="small" style={[styles.errorText, { color: theme.accent }]}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        onPress={handleSave}
        style={[styles.saveButton, { backgroundColor: theme.brand }]}>
        <ThemedText type="smallBold" style={styles.saveText}>
          Guardar movimiento
        </ThemedText>
      </Pressable>

      {showPicker && Platform.OS !== 'web' ? (
        <DateTimePicker
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
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    gap: 4,
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
    fontSize: 28,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: 700,
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
  input: {
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: 600,
  },
  pillSelected: {
    borderWidth: 1.5,
  },
  pillPressed: {
    opacity: 0.85,
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
});
