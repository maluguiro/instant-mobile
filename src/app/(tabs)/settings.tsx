import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { clearAllData } from '@/lib/storage';

type SettingItem = {
  label: string;
  subtitle?: string;
  route?: string;
  action?: () => void;
};

const settingsGroups: Array<{ title: string; items: SettingItem[] }> = [
  {
    title: 'Ayuda',
    items: [{ label: 'Cómo usar Instant', route: '/help', subtitle: 'Guía rápida por temas' }],
  },
  {
    title: 'Categorías y métodos',
    items: [
      { label: 'Categorías', route: '/categories', subtitle: 'Administrá tus categorías' },
      { label: 'Métodos de pago', route: '/payment-methods', subtitle: 'Administrá tus métodos' },
    ],
  },
  {
    title: 'Preferencias',
    items: [
      { label: 'Moneda', subtitle: 'ARS · próximamente' },
      { label: 'Apariencia', subtitle: 'Modo oscuro (próximamente)' },
    ],
  },
  {
    title: 'Notificaciones',
    items: [
      { label: 'Vencimientos', subtitle: 'Recordatorios (próximamente)' },
      { label: 'Resumen semanal', subtitle: 'Avisos semanales (próximamente)' },
      { label: 'Ahorro programado', subtitle: 'Alertas de ahorro (próximamente)' },
    ],
  },
  {
    title: 'Exportar',
    items: [{ label: 'Exportar datos', subtitle: 'Descargar resumen', action: () => {} }],
  },
];

export default function SettingsScreen() {
  const handleExport = () => {
    Alert.alert('Exportar datos', 'Esta opción estará disponible próximamente.');
  };

  const handleReset = () => {
    Alert.alert(
      'Borrar datos',
      'Vas a eliminar tus movimientos, metas y configuraciones locales. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Datos borrados', 'Se reinició la información local de Instant.');
          },
        },
      ]
    );
  };

  const resolvedGroups = settingsGroups.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      item.label === 'Exportar datos' ? { ...item, action: handleExport } : item
    ),
  }));

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Ajustes</ThemedText>
        <ThemedText themeColor="textSecondary">
          Personalizá Instant a tu forma de organizarte.
        </ThemedText>
      </View>

      {resolvedGroups.map((section) => (
        <Card key={section.title} variant="soft">
          <SectionHeader title={section.title} />
          <View style={styles.listGap}>
            {section.items.map((item) => {
              const onPress = item.action ?? (item.route ? () => router.push(item.route) : undefined);
              const content = (
                <ListItem title={item.label} subtitle={item.subtitle} trailing={item.route ? '›' : undefined} />
              );
              return onPress ? (
                <Pressable key={item.label} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
                  {content}
                </Pressable>
              ) : (
                <View key={item.label}>{content}</View>
              );
            })}
          </View>
        </Card>
      ))}

      <Card variant="soft">
        <SectionHeader title="Reiniciar datos" />
        <ThemedText type="small" themeColor="textSecondary">
          Usá esta opción solo si necesitás empezar de cero en este dispositivo.
        </ThemedText>
        <Pressable onPress={handleReset} style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.dangerText}>
            Borrar datos locales
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
  pressed: {
    opacity: 0.85,
  },
  dangerButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F1D9D2',
  },
  dangerText: {
    color: '#7A3B2A',
  },
});
