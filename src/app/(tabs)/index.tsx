import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { StatRow } from '@/components/ui/stat-row';
import {
  highlightCards,
  quickActions,
  recentMovements,
  summaryStats,
  upcomingBills,
} from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Hola, Malena</ThemedText>
        <ThemedText themeColor="textSecondary">
          ¿Cómo estás hoy? Esta es tu foto financiera.
        </ThemedText>
      </View>

      <Card style={[styles.primaryCard, { backgroundColor: theme.cardAlt }]}
        >
        <View style={styles.primaryHeader}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              {highlightCards.monthly.label}
            </ThemedText>
            <ThemedText type="title" style={styles.primaryValue}>
              {highlightCards.monthly.amount}
            </ThemedText>
          </View>
          <Pill label="Disponible" tone="accent" />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {highlightCards.monthly.hint}
        </ThemedText>
      </Card>

      <Card style={styles.secondaryCard}>
        <View style={styles.secondaryHeader}>
          <ThemedText type="small" themeColor="textSecondary">
            {highlightCards.weekly.label}
          </ThemedText>
          <Pill label="Semana actual" />
        </View>
        <ThemedText type="subtitle" style={styles.secondaryValue}>
          {highlightCards.weekly.amount}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Ajustable según tus decisiones de hoy
        </ThemedText>
      </Card>

      <Card>
        <SectionHeader title="Resumen de hoy" />
        <View style={styles.statsRow}>
          {summaryStats.map((stat) => (
            <StatRow
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tone={stat.tone as 'positive' | 'neutral'}
              style={styles.statItem}
            />
          ))}
        </View>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Accesos rápidos" />
        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.route)}
              style={({ pressed }) => [
                styles.quickAction,
                { borderColor: theme.border, backgroundColor: theme.card },
                pressed && styles.quickActionPressed,
              ]}>
              <ThemedText type="smallBold">{action.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Tus focos" />
        <View style={styles.focusRow}>
          <Pressable
            onPress={() => router.push('/savings-goals')}
            style={({ pressed }) => [
              styles.focusCard,
              { backgroundColor: theme.brandSoft },
              pressed && styles.quickActionPressed,
            ]}>
            <ThemedText type="smallBold">Metas de ahorro</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              3 metas activas
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/instant-duo')}
            style={({ pressed }) => [
              styles.focusCard,
              { backgroundColor: theme.accentSoft },
              pressed && styles.quickActionPressed,
            ]}>
            <ThemedText type="smallBold">Instant Duo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Balance compartido
            </ThemedText>
          </Pressable>
        </View>
      </Card>

      <Card>
        <SectionHeader
          title="Últimos movimientos"
          actionLabel="Ver todos"
          onPress={() => router.push('/movements')}
        />
        <View style={styles.listGap}>
          {recentMovements.slice(0, 3).map((movement) => (
            <ListItem
              key={movement.id}
              title={movement.title}
              subtitle={`${movement.category} · ${movement.date}`}
              trailing={movement.amount}
            />
          ))}
        </View>
      </Card>

      <Card variant="soft">
        <SectionHeader title="Próximos vencimientos" />
        <View style={styles.listGap}>
          {upcomingBills.map((bill) => (
            <ListItem
              key={bill.id}
              title={bill.title}
              subtitle={`Vence ${bill.due}`}
              trailing={bill.amount}
            />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  primaryCard: {
    gap: Spacing.two,
  },
  primaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  primaryValue: {
    fontSize: 36,
    lineHeight: 40,
  },
  secondaryCard: {
    gap: Spacing.one,
  },
  secondaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  secondaryValue: {
    fontSize: 26,
    lineHeight: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
    marginTop: Spacing.three,
  },
  statItem: {
    minWidth: 110,
  },
  quickActions: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  quickAction: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickActionPressed: {
    opacity: 0.85,
  },
  focusRow: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  focusCard: {
    flex: 1,
    minWidth: 160,
    padding: Spacing.three,
    borderRadius: 18,
    gap: Spacing.one,
  },
  listGap: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
});
