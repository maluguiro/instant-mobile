
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { SelectableOption } from '@/components/ui/selectable-option';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  endOfWeek,
  formatCurrency,
  formatShortDate,
  formatTime,
  groupByDate,
  startOfWeek,
  toISODate,
} from '@/lib/finance';
import { useTransactions } from '@/hooks/use-transactions';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PERIOD_FILTERS = ['Hoy', 'Esta semana', 'Este mes', 'Personalizado'] as const;
const TYPE_FILTERS = ['Todos', 'Entradas', 'Salidas'] as const;

type PeriodFilter = (typeof PERIOD_FILTERS)[number];
type TypeFilter = (typeof TYPE_FILTERS)[number];

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
  const { transactions, refresh } = useTransactions();
  const NativeDateTimePicker = useMemo(() => getNativeDateTimePicker(), []);
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('Este mes');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

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
    return filtered.reduce(
      (acc, tx) => {
        if (tx.type === 'income') {
          acc.income += tx.amount;
        } else {
          acc.expense += tx.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [filtered]);

  const balance = summary.income - summary.expense;

  const handleExport = () => {
    Alert.alert(
      'Exportar resumen',
      'Estamos preparando la exportación. Este resumen se generará en la siguiente versión.'
    );
  };

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
            <ThemedText type="smallBold" style={{ color: theme.success }}>
              {formatCurrency(summary.income)}
            </ThemedText>
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Salidas
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              {formatCurrency(summary.expense)}
            </ThemedText>
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              Balance
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: balance >= 0 ? theme.success : theme.accent }}>
              {formatCurrency(balance)}
            </ThemedText>
          </View>
        </View>
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
                  style={{ color: total >= 0 ? theme.success : theme.accent }}>
                  {formatCurrency(total)}
                </ThemedText>
              </View>
              <View style={styles.listGap}>
                {group.items.map((item) => {
                  const isIncome = item.type === 'income';
                  return (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <ThemedText type="smallBold">{item.category}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.method} · {formatShortDate(item.date)} · {formatTime(item.createdAt)}
                        </ThemedText>
                      </View>
                      <View style={styles.itemAmount}>
                        <ThemedText
                          type="smallBold"
                          style={{ color: isIncome ? theme.success : theme.accent }}>
                          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {isIncome ? 'Entrada' : 'Salida'}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })
      )}

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
                  setPeriodFilter('Este mes');
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
                  { backgroundColor: theme.brand },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={[styles.closeText, { color: theme.onBrand }]}>
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
    gap: Spacing.three,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
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
  modalActions: {
    gap: Spacing.two,
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
  closeText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.85,
  },
});
