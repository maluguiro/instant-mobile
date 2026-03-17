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
  'Cuenta',
  'Home',
  'Movimientos',
  'Presupuesto',
  'Calendario',
  'Registro de ingresos y egresos',
  'Ahorro y plan semanal',
  'Vencimientos y cuotas',
  'Categorías y métodos',
  'Exportación',
  'Notificaciones',
  'Tema claro/oscuro',
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
    marginTop: Spacing.two,
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
  Cuenta: [
    'Tu cuenta sirve para respaldar tu información y recuperarla cuando la necesites.',
    'Más adelante permitirá usar Instant en varios dispositivos y compartir datos en Instant Duo.',
  ],
  Home: [
    'Home responde rápido a “¿cómo estoy hoy?”.',
    'Vas a ver tu disponible mensual y semanal, más los movimientos recientes.',
    'Desde ahí podés acceder a las secciones principales.',
  ],
  Movimientos: [
    'Movimientos es tu historial completo.',
    'Podés buscar, filtrar y ver el detalle de ingresos y egresos.',
    'Es ideal para entender qué pasó en un período.',
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
  'Registro de ingresos y egresos': [
    'Usá “Agregar movimiento” para cargar ingresos o egresos rápidamente.',
    'Elegí categoría, fecha y método de pago. Con eso ya queda registrado.',
    'Todo se guarda localmente y se refleja en Home y Movimientos.',
  ],
  'Ahorro y plan semanal': [
    'El ahorro es una reserva separada y siempre se muestra como valor positivo.',
    'El plan semanal te ayuda a decidir cuánto querés usar cada semana.',
    'Ambos se configuran en Presupuesto para que todo quede ordenado.',
  ],
  'Vencimientos y cuotas': [
    'En Calendario podés cargar vencimientos únicos, pagos recurrentes y cuotas.',
    'La vista de próximos te ayuda a ver qué se viene antes.',
    'Podés marcar pagos, pausar recurrentes y completar cuotas.',
  ],
  'Categorías y métodos': [
    'Desde Ajustes podés crear, editar o eliminar categorías y métodos de pago.',
    'Si un elemento ya está en uso, la app te avisa antes de eliminarlo.',
  ],
  Exportación: [
    'Podés exportar tus datos desde Ajustes > Exportar datos.',
    'Elegí exportar por período, un resumen o todo el historial.',
  ],
  Notificaciones: [
    'En Ajustes podés activar recordatorios de vencimientos, resumen semanal y ahorro programado.',
    'Por ahora se guarda la preferencia localmente para una versión futura con notificaciones reales.',
  ],
  'Tema claro/oscuro': [
    'Podés cambiar entre modo claro y oscuro desde el ícono del encabezado.',
    'La elección se guarda localmente y se aplica en toda la app.',
  ],
  'Preguntas frecuentes': [
    '¿Mis datos se sincronizan? Por ahora se guardan solo en este dispositivo.',
    '¿Puedo exportar? Sí, desde Ajustes > Exportar datos.',
    '¿Cómo cambio la moneda? En Ajustes > Moneda.',
  ],
};
