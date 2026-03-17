import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Share } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectableOption } from '@/components/ui/selectable-option';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { calculateAvailable, calculateTotals, formatCurrency, toISODate } from '@/lib/finance';
import { getFinanceSettings } from '@/lib/finance-settings';
import { getTransactions } from '@/lib/transactions';
import { Transaction } from '@/lib/types';

type PeriodOption = 'Este mes' | 'Mes anterior' | 'Este año' | 'Personalizado';

function getNativeDateTimePicker() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-community/datetimepicker').default;
  } catch {
    return null;
  }
}

function toCsvValue(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function formatDateLabel(value: string) {
  return value;
}

function filterTransactions(transactions: Transaction[], period: PeriodOption, start?: Date, end?: Date) {
  const now = new Date();
  if (period === 'Este mes') {
    const month = now.getMonth();
    const year = now.getFullYear();
    return transactions.filter((tx) => {
      const date = new Date(tx.date + 'T00:00:00');
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }
  if (period === 'Mes anterior') {
    const month = now.getMonth() - 1;
    const year = month < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const targetMonth = (month + 12) % 12;
    return transactions.filter((tx) => {
      const date = new Date(tx.date + 'T00:00:00');
      return date.getFullYear() === year && date.getMonth() === targetMonth;
    });
  }
  if (period === 'Este año') {
    const year = now.getFullYear();
    return transactions.filter((tx) => {
      const date = new Date(tx.date + 'T00:00:00');
      return date.getFullYear() === year;
    });
  }
  if (period === 'Personalizado' && start && end) {
    const from = new Date(start);
    const to = new Date(end);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return transactions.filter((tx) => {
      const date = new Date(tx.date + 'T00:00:00');
      return date >= from && date <= to;
    });
  }
  return transactions;
}

async function exportCsv(filename: string, csv: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: csv });
}

export default function ExportDataScreen() {
  const theme = useTheme();
  const NativeDateTimePicker = useMemo(() => getNativeDateTimePicker(), []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<PeriodOption>('Este mes');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getFinanceSettings>> | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getTransactions(), getFinanceSettings()]).then(([items, config]) => {
        setTransactions(items);
        setSettings(config);
      });
    }, [])
  );

  const filtered = useMemo(
    () => filterTransactions(transactions, period, startDate, endDate),
    [transactions, period, startDate, endDate]
  );

  const totals = useMemo(() => calculateTotals(filtered), [filtered]);
  const availability = useMemo(
    () => (settings ? calculateAvailable(totals, settings) : { savingsTotal: 0, available: 0, savingsReserved: 0 }),
    [totals, settings]
  );

  const summaryByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of filtered) {
      if (tx.type !== 'expense') continue;
      map.set(tx.category, (map.get(tx.category) ?? 0) + tx.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const handleExportPeriod = async () => {
    if (period === 'Personalizado' && (!startDate || !endDate)) {
      Alert.alert('Rango incompleto', 'Seleccioná las fechas desde y hasta.');
      return;
    }
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Método', 'Monto', 'Nota'];
    const rows = filtered.map((tx) => [
      toCsvValue(tx.date),
      toCsvValue(tx.type === 'income' ? 'Ingreso' : 'Egreso'),
      toCsvValue(tx.category),
      toCsvValue(tx.method),
      toCsvValue(String(tx.amount)),
      toCsvValue((tx as Transaction & { note?: string }).note ?? ''),
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    await exportCsv('instant-movimientos.csv', csv);
  };

  const handleExportSummary = async () => {
    const headers = ['Concepto', 'Valor'];
    const summaryRows = [
      ['Ingresos', formatCurrency(totals.income)],
      ['Egresos', formatCurrency(totals.expense)],
      ['Ahorro', formatCurrency(availability.savingsTotal)],
      ['Balance', formatCurrency(availability.available)],
    ];
    const categoryHeader = ['Categoría', 'Monto'];
    const categoryRows = summaryByCategory.map(([category, amount]) => [category, formatCurrency(amount)]);
    const csv = [
      headers.join(','),
      ...summaryRows.map((row) => row.map(toCsvValue).join(',')),
      '',
      categoryHeader.join(','),
      ...categoryRows.map((row) => row.map(toCsvValue).join(',')),
    ].join('\n');
    await exportCsv('instant-resumen.csv', csv);
  };

  const handleExportAll = async () => {
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Método', 'Monto', 'Nota'];
    const rows = transactions.map((tx) => [
      toCsvValue(tx.date),
      toCsvValue(tx.type === 'income' ? 'Ingreso' : 'Egreso'),
      toCsvValue(tx.category),
      toCsvValue(tx.method),
      toCsvValue(String(tx.amount)),
      toCsvValue((tx as Transaction & { note?: string }).note ?? ''),
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    await exportCsv('instant-movimientos-todos.csv', csv);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Exportar datos</ThemedText>
        <ThemedText themeColor="textSecondary">
          Elegí el tipo de exportación que necesitás.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Por período" />
        <View style={styles.tabsRow}>
          {(['Este mes', 'Mes anterior', 'Este año', 'Personalizado'] as PeriodOption[]).map((option) => (
            <SelectableOption
              key={option}
              label={option}
              selected={period === option}
              onPress={() => setPeriod(option)}
            />
          ))}
        </View>
        {period === 'Personalizado' ? (
          <View style={styles.rangeRow}>
            <Pressable
              onPress={() => {
                if (!NativeDateTimePicker) return;
                setPickerTarget('start');
                setShowPicker(true);
              }}
              style={({ pressed }) => [
                styles.selectBox,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" themeColor="textSecondary">
                Desde
              </ThemedText>
              <ThemedText type="smallBold">{formatDateLabel(toISODate(startDate))}</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!NativeDateTimePicker) return;
                setPickerTarget('end');
                setShowPicker(true);
              }}
              style={({ pressed }) => [
                styles.selectBox,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" themeColor="textSecondary">
                Hasta
              </ThemedText>
              <ThemedText type="smallBold">{formatDateLabel(toISODate(endDate))}</ThemedText>
            </Pressable>
          </View>
        ) : null}
        {Platform.OS === 'web' && period === 'Personalizado' ? (
          <View style={styles.rangeRow}>
            <TextInput
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={toISODate(startDate)}
              onChangeText={(value) => setStartDate(new Date(value + 'T00:00:00'))}
            />
            <TextInput
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={toISODate(endDate)}
              onChangeText={(value) => setEndDate(new Date(value + 'T00:00:00'))}
            />
          </View>
        ) : null}
        <Pressable
          onPress={handleExportPeriod}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
            Exportar movimientos del período
          </ThemedText>
        </Pressable>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Resumen" />
        <View style={styles.summaryRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Ingresos: {formatCurrency(totals.income)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Egresos: {formatCurrency(totals.expense)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ahorro: {formatCurrency(availability.savingsTotal)}
          </ThemedText>
        </View>
        <Pressable
          onPress={handleExportSummary}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
            Exportar resumen
          </ThemedText>
        </Pressable>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Todo" />
        <ThemedText type="small" themeColor="textSecondary">
          Exportá todo tu historial de movimientos como respaldo completo.
        </ThemedText>
        <Pressable
          onPress={handleExportAll}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
            Exportar todo
          </ThemedText>
        </Pressable>
      </Card>

      {showPicker && NativeDateTimePicker ? (
        <NativeDateTimePicker
          value={pickerTarget === 'end' ? endDate : startDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (!date) return;
            if (pickerTarget === 'end') {
              setEndDate(date);
            } else {
              setStartDate(date);
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
  tabsRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  rangeRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  summaryRow: {
    marginTop: Spacing.two,
    gap: Spacing.one,
  },
  selectBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.one,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.85,
  },
});
