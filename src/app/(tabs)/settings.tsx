import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ListItem } from '@/components/ui/list-item';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { settingsSections } from '@/constants/mock-data';
import { Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Ajustes</ThemedText>
        <ThemedText themeColor="textSecondary">
          Personalizá Instant a tu forma de organizarte.
        </ThemedText>
      </View>

      {settingsSections.map((section) => (
        <Card key={section.title} variant="soft">
          <SectionHeader title={section.title} />
          <View style={styles.listGap}>
            {section.items.map((item) => (
              <ListItem key={item} title={item} trailing="→" />
            ))}
          </View>
        </Card>
      ))}
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
});
