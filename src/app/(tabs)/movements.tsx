import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
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

const FILTERS = ['Todos', 'Ingresos', 'Egresos', 'Hoy', 'Esta semana'] as const;

type Filter = (typeof FILTERS)[number];

export default function MovementsScreen() {
  const theme = useTheme();
  const { transactions, refresh } = useTransactions();
  const [filter, setFilter] = useState<Filter>('Todos');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filtered = useMemo(() => {
    const today = toISODate(new Date());
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    switch (filter) {
      case 'Ingresos':
        return transactions.filter((tx) => tx.type === 'income');
      case 'Egresos':
        return transactions.filter((tx) => tx.type === 'expense');
      case 'Hoy':
        return transactions.filter((tx) => tx.date === today);
      case 'Esta semana':
        return transactions.filter((tx) => {
          const date = new Date(tx.date + 'T00:00:00');
          return date >= weekStart && date <= weekEnd;
        });
      default:
        return transactions;
    }
  }, [transactions, filter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Movimientos</ThemedText>
        <ThemedText themeColor="textSecondary">
          Todo lo que pasó, ordenado y fácil de leer.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Filtros rápidos" />
        <View style={styles.filters}>
          {FILTERS.map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)}>
              <Pill label={item} tone={filter === item ? 'accent' : 'default'} />
            </Pressable>
          ))}
        </View>
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
                          {item.method} · {formatTime(item.createdAt)}
                        </ThemedText>
                      </View>
                      <View style={styles.itemAmount}>
                        <ThemedText
                          type="smallBold"
                          style={{ color: isIncome ? theme.success : theme.accent }}>
                          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {isIncome ? 'Ingreso' : 'Egreso'}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  filters: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
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
});
