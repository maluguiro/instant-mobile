import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addCategory, getCategories } from '@/lib/categories';

export default function CategoriesScreen() {
  const theme = useTheme();
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  useFocusEffect(
    useCallback(() => {
      getCategories().then(setCategories);
    }, [])
  );

  const handleAdd = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const next = await addCategory(trimmed);
    setCategories(next);
    setNewCategory('');
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
            categories.map((item) => <ListItem key={item} title={item} />)
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
          <ThemedText type="smallBold" style={styles.primaryText}>
            Guardar categoría
          </ThemedText>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
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
  pressed: {
    opacity: 0.85,
  },
});
