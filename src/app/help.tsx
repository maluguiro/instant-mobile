import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SelectableOption } from '@/components/ui/selectable-option';
import { Spacing } from '@/constants/theme';

const HELP_TOPICS = [
  'Qué es Instant',
  'Home',
  'Movimientos',
  'Presupuesto',
  'Calendario',
  'Registro de ingresos y egresos',
  'Ahorro y plan semanal',
  'Vencimientos y cuotas',
  'Preguntas frecuentes',
] as const;

type HelpTopic = (typeof HELP_TOPICS)[number];

export default function HelpScreen() {
  const [activeTopic, setActiveTopic] = useState<HelpTopic>('Qué es Instant');
  const content = HELP_CONTENT[activeTopic];

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Cómo usar Instant</ThemedText>
        <ThemedText themeColor="textSecondary">
          Elegí un tema para ver una guía clara y directa.
        </ThemedText>
      </View>

      <Card variant="soft">
        <SectionHeader title="Temas" />
        <View style={styles.topicGrid}>
          {HELP_TOPICS.map((topic) => (
            <SelectableOption
              key={topic}
              label={topic}
              selected={activeTopic === topic}
              onPress={() => setActiveTopic(topic)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title={activeTopic} />
        {content ? (
          <View style={styles.contentStack}>
            {content.map((paragraph) => (
              <ThemedText key={paragraph} type="small" themeColor="textSecondary">
                {paragraph}
              </ThemedText>
            ))}
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Contenido en preparación. Vamos a sumar una guía breve para este tema.
          </ThemedText>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  topicGrid: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  contentStack: {
    gap: Spacing.two,
  },
});

const HELP_CONTENT: Partial<Record<HelpTopic, string[]>> = {
  'Qué es Instant': [
    'Instant es una app simple para registrar ingresos y egresos en segundos.',
    'Te ayuda a ver tu disponible mensual y semanal sin vueltas.',
    'El foco está en claridad y orden, no en complejidad.',
  ],
  'Registro de ingresos y egresos': [
    'Usá “Agregar movimiento” para cargar ingresos o egresos rápidamente.',
    'Elegí categoría, fecha y método de pago. Con eso ya queda registrado.',
    'Todo se guarda localmente y se refleja en Home y Movimientos.',
  ],
  Presupuesto: [
    'Presupuesto es tu centro de planificación: ahorro, plan semanal y metas.',
    'Configurá cuánto querés reservar y cómo se organiza tu semana.',
    'La idea es que tengas un plan claro, no solo una foto del mes.',
  ],
  Calendario: [
    'Calendario reúne pagos únicos, recurrentes y cuotas en un solo lugar.',
    'Te permite ver qué se viene pronto y registrar cada compromiso.',
    'Así podés anticiparte y evitar sorpresas.',
  ],
};
