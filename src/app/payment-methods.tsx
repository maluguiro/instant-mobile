import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useDuo } from '@/hooks/use-duo';
import { useTheme } from '@/hooks/use-theme';
import { addPaymentMethod, BASE_PAYMENT_METHODS, getPaymentMethods, removePaymentMethod, updatePaymentMethod } from '@/lib/payment-methods';
import { getTransactions, updateTransactionMethod } from '@/lib/transactions';

export default function PaymentMethodsScreen() {
  const theme = useTheme();
  const [methods, setMethods] = useState<string[]>([]);
  const [newMethod, setNewMethod] = useState('');
  const [editingMethod, setEditingMethod] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [transactions, setTransactions] = useState<Awaited<ReturnType<typeof getTransactions>>>([]);
  const { state: duoState } = useDuo();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getPaymentMethods(), getTransactions()])
        .then(([items, tx]) => {
          if (!active) return;
          const merged = Array.from(new Set([...items, ...BASE_PAYMENT_METHODS]));
          setMethods(merged);
          setTransactions(tx);
        })
        .catch(() => {
          if (!active) return;
          setTransactions([]);
        });
      return () => {
        active = false;
      };
    }, [duoState.activeContext, duoState.duoId])
  );

  const usedMethods = useMemo(() => {
    const used = new Map<string, number>();
    for (const tx of transactions) {
      used.set(tx.method, (used.get(tx.method) ?? 0) + 1);
    }
    return used;
  }, [transactions]);

  const handleAdd = async () => {
    const trimmed = newMethod.trim();
    if (!trimmed) return;
    const exists = methods.some(
      (item) => item.localeCompare(trimmed, undefined, { sensitivity: 'accent' }) === 0
    );
    if (exists) {
      Alert.alert('Método duplicado', 'Ya existe un método con ese nombre.');
      return;
    }
    const next = await addPaymentMethod(trimmed);
    setMethods(Array.from(new Set([...next, ...BASE_PAYMENT_METHODS])));
    setNewMethod('');
  };

  const isBaseMethod = (method: string) =>
    BASE_PAYMENT_METHODS.some((item) => item.localeCompare(method, undefined, { sensitivity: 'accent' }) === 0);

  const handleEdit = (method: string) => {
    if (isBaseMethod(method)) {
      Alert.alert('Método base', 'Los métodos base no se pueden editar.');
      return;
    }
    setEditingMethod(method);
    setEditingValue(method);
  };

  const handleSaveEdit = async () => {
    if (!editingMethod) return;
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    const exists = methods.some(
      (item) =>
        item.localeCompare(trimmed, undefined, { sensitivity: 'accent' }) === 0 &&
        item.localeCompare(editingMethod, undefined, { sensitivity: 'accent' }) !== 0
    );
    if (exists) {
      Alert.alert('Método duplicado', 'Ya existe un método con ese nombre.');
      return;
    }
    const next = await updatePaymentMethod(editingMethod, trimmed);
    await updateTransactionMethod(editingMethod, trimmed);
    setMethods(Array.from(new Set([...next, ...BASE_PAYMENT_METHODS])));
    setEditingMethod(null);
    setEditingValue('');
  };

  const handleDelete = (method: string) => {
    if (isBaseMethod(method)) {
      Alert.alert('Método base', 'Los métodos base no se pueden eliminar.');
      return;
    }
    const usedCount = usedMethods.get(method) ?? 0;
    if (usedCount > 0) {
      Alert.alert(
        'Método en uso',
        `Este método está presente en ${usedCount} movimiento${usedCount === 1 ? '' : 's'}.`
      );
      return;
    }
    Alert.alert('Eliminar método', '¿Querés eliminar este método?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const next = await removePaymentMethod(method);
          setMethods(Array.from(new Set([...next, ...BASE_PAYMENT_METHODS])));
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Métodos de pago</ThemedText>
        <ThemedText themeColor="textSecondary">Administrá tus métodos preferidos.</ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Tus métodos" />
        <View style={styles.listGap}>
          {methods.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Todavía no agregaste métodos personalizados.
            </ThemedText>
          ) : (
            methods.map((item) => {
              const isBase = isBaseMethod(item);
              return (
                <View key={item} style={styles.itemRow}>
                  <View style={styles.itemText}>
                    <ThemedText>{item}</ThemedText>
                    {isBase ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Base
                      </ThemedText>
                    ) : null}
                  </View>
                  {!isBase ? (
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => handleEdit(item)}
                        style={({ pressed }) => [
                          styles.actionChip,
                          { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText type="small" style={{ color: theme.brand }}>
                          Editar
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(item)}
                        style={({ pressed }) => [
                          styles.actionChip,
                          { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Eliminar
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Agregar método" />
        <TextInput
          placeholder="Ej. Visa, Mercado Pago..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={newMethod}
          onChangeText={setNewMethod}
        />
        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
            Guardar método
          </ThemedText>
        </Pressable>
      </Card>

      <Modal visible={!!editingMethod} transparent animationType="fade" onRequestClose={() => setEditingMethod(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <ThemedText type="subtitle">Editar método</ThemedText>
            <TextInput
              placeholder="Nuevo nombre"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={editingValue}
              onChangeText={setEditingValue}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditingMethod(null)}
                style={({ pressed }) => [styles.outlineButton, { borderColor: theme.border }, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.brand },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
                  Guardar
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
    marginTop: Spacing.two,
  },
  listGap: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  input: {
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalCard: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
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
  pressed: {
    opacity: 0.85,
  },
});
