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
import { addPaymentMethod, getPaymentMethods } from '@/lib/payment-methods';

export default function PaymentMethodsScreen() {
  const theme = useTheme();
  const [methods, setMethods] = useState<string[]>([]);
  const [newMethod, setNewMethod] = useState('');

  useFocusEffect(
    useCallback(() => {
      getPaymentMethods().then(setMethods);
    }, [])
  );

  const handleAdd = async () => {
    const trimmed = newMethod.trim();
    if (!trimmed) return;
    const next = await addPaymentMethod(trimmed);
    setMethods(next);
    setNewMethod('');
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
            methods.map((item) => <ListItem key={item} title={item} />)
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
          <ThemedText type="smallBold" style={styles.primaryText}>
            Guardar método
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
