import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectableOption } from '@/components/ui/selectable-option';
import { Spacing } from '@/constants/theme';
import { CurrencyCode } from '@/lib/app-settings';
import { useAppSettings } from '@/hooks/use-app-settings';

const CURRENCIES: CurrencyCode[] = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'];

export default function CurrencyScreen() {
  const { settings, update } = useAppSettings();

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Moneda</ThemedText>
        <ThemedText themeColor="textSecondary">Elegí la moneda principal de la app.</ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Moneda principal" />
        <View style={styles.grid}>
          {CURRENCIES.map((code) => (
            <SelectableOption
              key={code}
              label={code}
              selected={settings.currency === code}
              onPress={() => update({ currency: code })}
            />
          ))}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          La moneda se aplica en montos y resúmenes.
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  grid: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
