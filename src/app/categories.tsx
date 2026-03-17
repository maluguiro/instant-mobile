import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addCategory, BASE_CATEGORIES, getCategories, isBaseCategory, removeCategory, updateCategory } from '@/lib/categories';
import { getTransactions, updateTransactionCategory } from '@/lib/transactions';

export default function CategoriesScreen() {
  const theme = useTheme();
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [transactions, setTransactions] = useState<Awaited<ReturnType<typeof getTransactions>>>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getCategories(), getTransactions()]).then(([items, tx]) => {
        setCategories(items);
        setTransactions(tx);
      });
    }, [])
  );

  const usedCategories = useMemo(() => {
    const used = new Map<string, number>();
    for (const tx of transactions) {
      used.set(tx.category, (used.get(tx.category) ?? 0) + 1);
    }
    return used;
  }, [transactions]);

  const handleAdd = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const exists = categories.some(
      (item) => item.localeCompare(trimmed, undefined, { sensitivity: 'accent' }) === 0
    );
    if (exists) {
      Alert.alert('Categoría duplicada', 'Ya existe una categoría con ese nombre.');
      return;
    }
    const next = await addCategory(trimmed);
    setCategories(next);
    setNewCategory('');
  };

  const handleEdit = (category: string) => {
    if (isBaseCategory(category)) {
      Alert.alert('Categoría base', 'Las categorías base no se pueden editar.');
      return;
    }
    setEditingCategory(category);
    setEditingValue(category);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    const exists = categories.some(
      (item) =>
        item.localeCompare(trimmed, undefined, { sensitivity: 'accent' }) === 0 &&
        item.localeCompare(editingCategory, undefined, { sensitivity: 'accent' }) !== 0
    );
    if (exists) {
      Alert.alert('Categoría duplicada', 'Ya existe una categoría con ese nombre.');
      return;
    }
    const next = await updateCategory(editingCategory, trimmed);
    await updateTransactionCategory(editingCategory, trimmed);
    setCategories(next);
    setEditingCategory(null);
    setEditingValue('');
  };

  const handleDelete = (category: string) => {
    if (isBaseCategory(category)) {
      Alert.alert('Categoría base', 'Las categorías base no se pueden eliminar.');
      return;
    }
    const usedCount = usedCategories.get(category) ?? 0;
    if (usedCount > 0) {
      Alert.alert(
        'Categoría en uso',
        `Esta categoría está presente en ${usedCount} movimiento${usedCount === 1 ? '' : 's'}.`
      );
      return;
    }
    Alert.alert('Eliminar categoría', '¿Querés eliminar esta categoría?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const next = await removeCategory(category);
          setCategories(next);
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Categorías</ThemedText>
        <ThemedText themeColor="textSecondary">Administrá tus categorías de gasto e ingreso.</ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Tus categorías" />
        <View style={styles.listGap}>
          {categories.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Todavía no agregaste categorías personalizadas.
            </ThemedText>
          ) : (
            categories.map((item) => {
              const isBase = BASE_CATEGORIES.includes(item);
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
        <SectionHeader title="Agregar categoría" />
        <TextInput
          placeholder="Ej. Transporte, Salud..."
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={newCategory}
          onChangeText={setNewCategory}
        />
        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.brand },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
            Guardar categoría
          </ThemedText>
        </Pressable>
      </Card>

      <Modal visible={!!editingCategory} transparent animationType="fade" onRequestClose={() => setEditingCategory(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <ThemedText type="subtitle">Editar categoría</ThemedText>
            <TextInput
              placeholder="Nuevo nombre"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={editingValue}
              onChangeText={setEditingValue}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditingCategory(null)}
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
