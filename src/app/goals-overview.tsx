import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency } from '@/lib/finance';
import { getSavingsGoals, removeSavingsGoal, SavingsGoal } from '@/lib/goals';

export default function GoalsOverviewScreen() {
  const theme = useTheme();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getSavingsGoals().then(setGoals);
    }, [])
  );

  const handleDeleteGoal = () => {
    if (goals.length === 0) {
      return;
    }
    setSelectedGoalId(goals[0]?.id ?? null);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedGoalId) return;
    const next = await removeSavingsGoal(selectedGoalId);
    setGoals(next);
    setDeleteOpen(false);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Metas de ahorro</ThemedText>
        <ThemedText themeColor="textSecondary">
          Tus metas actuales, siempre a mano.
        </ThemedText>
      </View>

      <Card>
        <SectionHeader title="Metas actuales" />
        <View style={styles.list}>
          {goals.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Todavía no creaste metas. Agregá una para empezar.
            </ThemedText>
          ) : (
            goals.map((goal) => (
              <View key={goal.id} style={styles.goalItem}>
                <View style={styles.goalHeader}>
                  <ThemedText type="smallBold">{goal.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatCurrency(goal.saved)} / {formatCurrency(goal.target)}
                  </ThemedText>
                </View>
                <ProgressBar value={goal.target ? goal.saved / goal.target : 0} />
              </View>
            ))
          )}
        </View>
      </Card>

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push({ pathname: '/budget', params: { tab: 'Metas' } })}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.brand },
            pressed && styles.buttonPressed,
          ]}>
        <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
          Nueva meta
        </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleDeleteGoal}
          style={({ pressed }) => [
            styles.outlineButton,
            { borderColor: theme.border },
            pressed && styles.buttonPressed,
          ]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Borrar una meta
          </ThemedText>
        </Pressable>
      </View>

      <Modal
        visible={deleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Eliminar meta</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Elegí la meta que querés borrar.
              </ThemedText>
            </View>

            <View style={styles.modalList}>
              {goals.map((goal) => {
                const selected = goal.id === selectedGoalId;
                return (
                  <Pressable
                    key={goal.id}
                    onPress={() => setSelectedGoalId(goal.id)}
                    style={({ pressed }) => [
                      styles.modalItem,
                      {
                        borderColor: selected ? theme.brand : theme.border,
                        backgroundColor: selected ? theme.brandSoft : theme.backgroundElement,
                      },
                      pressed && styles.buttonPressed,
                    ]}>
                    <ThemedText type="smallBold">{goal.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatCurrency(goal.saved)} / {formatCurrency(goal.target)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDeleteOpen(false)}
                style={({ pressed }) => [
                  styles.outlineButton,
                  { borderColor: theme.border },
                  pressed && styles.buttonPressed,
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.accent },
                  pressed && styles.buttonPressed,
                ]}>
                <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
                  Eliminar
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  list: {
    marginTop: Spacing.three,
    gap: Spacing.three,
  },
  goalItem: {
    gap: Spacing.two,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
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
  modalList: {
    gap: Spacing.two,
  },
  modalItem: {
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
  buttonPressed: {
    opacity: 0.85,
  },
});
