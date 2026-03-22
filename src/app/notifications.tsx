import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTheme } from '@/hooks/use-theme';
import { requestNotificationsPermission, scheduleLocalNotifications } from '@/lib/notifications';

type ScheduleType = 'dueDates' | 'weekly' | 'savings' | 'installments' | 'important';

function getNativeDateTimePicker() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-community/datetimepicker').default;
  } catch {
    return null;
  }
}

function parseTime(value: string) {
  const [h, m] = value.split(':').map((part) => Number(part));
  const hours = Number.isNaN(h) ? 9 : Math.min(Math.max(h, 0), 23);
  const minutes = Number.isNaN(m) ? 0 : Math.min(Math.max(m, 0), 59);
  return { hours, minutes };
}

function formatTime(value: string) {
  const { hours, minutes } = parseTime(value);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

async function handleToggle(
  enabled: boolean,
  update: (partial: { notifications: Record<string, unknown> }) => Promise<void>,
  key: string
) {
  if (enabled) {
    const ok = await requestNotificationsPermission();
    if (!ok) {
      Alert.alert('Permiso requerido', 'Necesitamos permiso para enviar recordatorios.');
      return;
    }
  }
  await update({ notifications: { [key]: enabled } });
  await scheduleLocalNotifications();
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const { settings, update } = useAppSettings();
  const NativeDateTimePicker = useMemo(() => getNativeDateTimePicker(), []);

  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(null);
  const [scheduleTime, setScheduleTime] = useState(new Date());
  const [scheduleAdvance, setScheduleAdvance] = useState('0');
  const [scheduleRepeat, setScheduleRepeat] = useState('1');
  const [showPicker, setShowPicker] = useState(false);
  const [expanded, setExpanded] = useState<Record<ScheduleType, boolean>>({
    dueDates: false,
    weekly: false,
    savings: false,
    installments: false,
    important: false,
  });

  useEffect(() => {
    if (!scheduleType) return;
    if (scheduleType === 'important') {
      const { hours, minutes } = parseTime(settings.notifications.important.time);
      const base = new Date();
      base.setHours(hours, minutes, 0, 0);
      setScheduleTime(base);
      setScheduleAdvance(String(settings.notifications.important.advanceDays ?? 0));
      setScheduleRepeat(String(settings.notifications.important.repeatDays ?? 1));
      return;
    }
    const current = settings.notifications.times[scheduleType];
    const { hours, minutes } = parseTime(current);
    const base = new Date();
    base.setHours(hours, minutes, 0, 0);
    setScheduleTime(base);
    setScheduleAdvance(String(settings.notifications.advanceDays[scheduleType] ?? 0));
  }, [scheduleType, settings.notifications.advanceDays, settings.notifications.important, settings.notifications.times]);

  const saveSchedule = async () => {
    if (!scheduleType) return;
    const hours = scheduleTime.getHours();
    const minutes = scheduleTime.getMinutes();
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const advance = Number(scheduleAdvance.replace(/[^0-9]/g, '') || 0);
    if (scheduleType === 'important') {
      const repeat = Number(scheduleRepeat.replace(/[^0-9]/g, '') || 0);
      await update({
        notifications: {
          important: {
            time,
            advanceDays: Number.isNaN(advance) ? 0 : advance,
            repeatDays: Number.isNaN(repeat) ? 0 : repeat,
          },
          customized: { important: true },
        },
      });
      await scheduleLocalNotifications();
      setScheduleType(null);
      return;
    }
    await update({
      notifications: {
        times: { [scheduleType]: time },
        advanceDays: { [scheduleType]: Number.isNaN(advance) ? 0 : advance },
        customized: { [scheduleType]: true },
      },
    });
    await scheduleLocalNotifications();
    setScheduleType(null);
  };

  const openSchedule = (type: ScheduleType) => setScheduleType(type);
  const toggleExpanded = (key: ScheduleType) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Notificaciones</ThemedText>
        <ThemedText themeColor="textSecondary">
          Activá recordatorios útiles para tu día a día.
        </ThemedText>
      </View>

      <Card variant="soft" style={styles.blockCard}>
        <View style={styles.sectionHeaderRow}>
          <SectionHeader title="Vencimientos" />
          <Pressable
            onPress={() => toggleExpanded('dueDates')}
            style={({ pressed }) => [styles.sectionHeaderAction, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              {expanded.dueDates ? 'Ocultar' : 'Configurar'}
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="small" themeColor="textSecondary">
              Avisos cuando se acerquen pagos importantes.
            </ThemedText>
          </View>
          <View style={styles.switchWrap}>
            <Switch
              value={settings.notifications.dueDates}
              onValueChange={(value) => handleToggle(value, update, 'dueDates')}
              trackColor={{ false: theme.border, true: theme.brandSoft }}
              thumbColor={settings.notifications.dueDates ? theme.brand : theme.onBrand}
            />
          </View>
        </View>
        {settings.notifications.dueDates && expanded.dueDates ? (
          <View style={styles.details}>
            {!settings.notifications.customized.dueDates ? (
              <ThemedText type="small" themeColor="textSecondary">
                Predeterminado: 11:00 · 2 días antes
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              Horario: {formatTime(settings.notifications.times.dueDates)} · Aviso: {settings.notifications.advanceDays.dueDates} días antes
            </ThemedText>
            <Pressable
              onPress={() => openSchedule('dueDates')}
              style={({ pressed }) => [
                styles.configureButton,
                { borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Programar horario
              </ThemedText>
            </Pressable>

            <View style={styles.optionRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Solo importantes
              </ThemedText>
              <Switch
                value={settings.notifications.dueDatesImportantOnly}
                onValueChange={async (value) => {
                  await update({ notifications: { dueDatesImportantOnly: value } });
                  await scheduleLocalNotifications();
                }}
                trackColor={{ false: theme.border, true: theme.brandSoft }}
                thumbColor={settings.notifications.dueDatesImportantOnly ? theme.brand : theme.onBrand}
              />
            </View>
            {settings.notifications.dueDatesImportantOnly ? (
              <View style={styles.optionRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  Monto mínimo
                </ThemedText>
                <TextInput
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.numberInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
                  ]}
                  value={String(settings.notifications.dueDatesMinAmount ?? 0)}
                  keyboardType="numeric"
                  onChangeText={async (value) => {
                    const parsed = Number(value.replace(/[^0-9]/g, '') || 0);
                    await update({
                      notifications: { dueDatesMinAmount: Number.isNaN(parsed) ? 0 : parsed },
                    });
                    await scheduleLocalNotifications();
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card variant="soft" style={styles.blockCard}>
        <View style={styles.sectionHeaderRow}>
          <SectionHeader title="Importantes" />
          <Pressable
            onPress={() => toggleExpanded('important')}
            style={({ pressed }) => [styles.sectionHeaderAction, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              {expanded.important ? 'Ocultar' : 'Configurar'}
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="small" themeColor="textSecondary">
              Avisos especiales para pagos marcados como importantes.
            </ThemedText>
          </View>
          <View style={styles.switchWrap}>
            <Switch
              value={settings.notifications.importantEnabled}
              onValueChange={async (value) => {
                await handleToggle(value, update, 'importantEnabled');
              }}
              trackColor={{ false: theme.border, true: theme.brandSoft }}
              thumbColor={settings.notifications.importantEnabled ? theme.brand : theme.onBrand}
            />
          </View>
        </View>
        {settings.notifications.importantEnabled && expanded.important ? (
          <View style={styles.details}>
            {!settings.notifications.customized.important ? (
              <ThemedText type="small" themeColor="textSecondary">
                Predeterminado: 11:00 · 2 días antes · Reaviso cada 1 día
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              Horario: {formatTime(settings.notifications.important.time)} · Aviso: {settings.notifications.important.advanceDays} días antes · Reaviso: cada {settings.notifications.important.repeatDays} día(s)
            </ThemedText>
            <Pressable
              onPress={() => openSchedule('important')}
              style={({ pressed }) => [
                styles.configureButton,
                { borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Programar horario
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </Card>

      <Card variant="soft" style={styles.blockCard}>
        <View style={styles.sectionHeaderRow}>
          <SectionHeader title="Plan semanal" />
          <Pressable
            onPress={() => toggleExpanded('weekly')}
            style={({ pressed }) => [styles.sectionHeaderAction, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              {expanded.weekly ? 'Ocultar' : 'Configurar'}
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="small" themeColor="textSecondary">
              Avisos cuando se renueve el disponible semanal.
            </ThemedText>
          </View>
          <View style={styles.switchWrap}>
            <Switch
              value={settings.notifications.weekly}
              onValueChange={(value) => handleToggle(value, update, 'weekly')}
              trackColor={{ false: theme.border, true: theme.brandSoft }}
              thumbColor={settings.notifications.weekly ? theme.brand : theme.onBrand}
            />
          </View>
        </View>
        {settings.notifications.weekly && expanded.weekly ? (
          <View style={styles.details}>
            {!settings.notifications.customized.weekly ? (
              <ThemedText type="small" themeColor="textSecondary">
                Predeterminado: 11:00 · 2 días antes
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              Horario: {formatTime(settings.notifications.times.weekly)} · Aviso: {settings.notifications.advanceDays.weekly} días antes
            </ThemedText>
            <Pressable
              onPress={() => openSchedule('weekly')}
              style={({ pressed }) => [
                styles.configureButton,
                { borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Programar horario
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </Card>

      <Card variant="soft" style={styles.blockCard}>
        <View style={styles.sectionHeaderRow}>
          <SectionHeader title="Ahorro programado" />
          <Pressable
            onPress={() => toggleExpanded('savings')}
            style={({ pressed }) => [styles.sectionHeaderAction, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              {expanded.savings ? 'Ocultar' : 'Configurar'}
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="small" themeColor="textSecondary">
              Avisos cuando toque reservar ahorro.
            </ThemedText>
          </View>
          <View style={styles.switchWrap}>
            <Switch
              value={settings.notifications.savings}
              onValueChange={(value) => handleToggle(value, update, 'savings')}
              trackColor={{ false: theme.border, true: theme.brandSoft }}
              thumbColor={settings.notifications.savings ? theme.brand : theme.onBrand}
            />
          </View>
        </View>
        {settings.notifications.savings && expanded.savings ? (
          <View style={styles.details}>
            {!settings.notifications.customized.savings ? (
              <ThemedText type="small" themeColor="textSecondary">
                Predeterminado: 11:00 · 2 días antes
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              Horario: {formatTime(settings.notifications.times.savings)} · Aviso: {settings.notifications.advanceDays.savings} días antes
            </ThemedText>
            <Pressable
              onPress={() => openSchedule('savings')}
              style={({ pressed }) => [
                styles.configureButton,
                { borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Programar horario
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </Card>

      <Card variant="soft" style={styles.blockCard}>
        <View style={styles.sectionHeaderRow}>
          <SectionHeader title="Cuotas" />
          <Pressable
            onPress={() => toggleExpanded('installments')}
            style={({ pressed }) => [styles.sectionHeaderAction, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              {expanded.installments ? 'Ocultar' : 'Configurar'}
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="small" themeColor="textSecondary">
              Avisos antes de la próxima cuota.
            </ThemedText>
          </View>
          <View style={styles.switchWrap}>
            <Switch
              value={settings.notifications.installments}
              onValueChange={(value) => handleToggle(value, update, 'installments')}
              trackColor={{ false: theme.border, true: theme.brandSoft }}
              thumbColor={settings.notifications.installments ? theme.brand : theme.onBrand}
            />
          </View>
        </View>
        {settings.notifications.installments && expanded.installments ? (
          <View style={styles.details}>
            {!settings.notifications.customized.installments ? (
              <ThemedText type="small" themeColor="textSecondary">
                Predeterminado: 11:00 · 2 días antes
              </ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              Horario: {formatTime(settings.notifications.times.installments)} · Aviso: {settings.notifications.advanceDays.installments} días antes
            </ThemedText>
            <Pressable
              onPress={() => openSchedule('installments')}
              style={({ pressed }) => [
                styles.configureButton,
                { borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Programar horario
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </Card>

      <Card variant="soft" style={styles.blockCard}>
        <SectionHeader title="Posponer" />
        <View style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="small" themeColor="textSecondary">
              Permite posponer 1h, 3h o para mañana.
            </ThemedText>
          </View>
          <View style={styles.switchWrap}>
            <Switch
              value={settings.notifications.snoozeEnabled}
              onValueChange={async (value) => {
                await update({ notifications: { snoozeEnabled: value } });
                await scheduleLocalNotifications();
              }}
              trackColor={{ false: theme.border, true: theme.brandSoft }}
              thumbColor={settings.notifications.snoozeEnabled ? theme.brand : theme.onBrand}
            />
          </View>
        </View>
      </Card>

      <Modal visible={!!scheduleType} transparent animationType="fade" onRequestClose={() => setScheduleType(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <SectionHeader title="Programar horario" />
            <ThemedText type="small" themeColor="textSecondary">
              Elegí hora y días de aviso previo.
            </ThemedText>

            <View style={styles.modalCentered}>
              <ThemedText type="small" themeColor="textSecondary">
                Hora
              </ThemedText>
              {NativeDateTimePicker ? (
                <>
                  <Pressable
                    onPress={() => setShowPicker(true)}
                    style={({ pressed }) => [
                      styles.timeButton,
                      { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {formatTime(`${scheduleTime.getHours()}:${scheduleTime.getMinutes()}`)}
                    </ThemedText>
                  </Pressable>
                  {showPicker ? (
                    <NativeDateTimePicker
                      value={scheduleTime}
                      mode="time"
                      display="default"
                      onChange={(_, date) => {
                        setShowPicker(false);
                        if (date) setScheduleTime(date);
                      }}
                    />
                  ) : null}
                </>
              ) : (
                <TextInput
                  placeholder="HH:MM"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.numberInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
                  ]}
                  value={formatTime(`${scheduleTime.getHours()}:${scheduleTime.getMinutes()}`)}
                  onChangeText={(value) => {
                    const [h, m] = value.split(':');
                    const hours = Number(h || 0);
                    const minutes = Number(m || 0);
                    const date = new Date();
                    date.setHours(hours, minutes, 0, 0);
                    setScheduleTime(date);
                  }}
                />
              )}
            </View>

            <View style={styles.modalCentered}>
              <ThemedText type="small" themeColor="textSecondary">
                Días antes
              </ThemedText>
              <TextInput
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.numberInput,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
                ]}
                value={scheduleAdvance}
                keyboardType="numeric"
                onChangeText={(value) => setScheduleAdvance(value.replace(/[^0-9]/g, ''))}
              />
            </View>
            {scheduleType === 'important' ? (
              <View style={styles.modalCentered}>
                <ThemedText type="small" themeColor="textSecondary">
                  Repetir aviso cada (días)
                </ThemedText>
                <TextInput
                  placeholder="1"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.numberInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
                  ]}
                  value={scheduleRepeat}
                  keyboardType="numeric"
                  onChangeText={(value) => setScheduleRepeat(value.replace(/[^0-9]/g, ''))}
                />
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setScheduleType(null)}
                style={({ pressed }) => [
                  styles.outlineButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={saveSchedule}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.brand },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onBrand }}>
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
  blockCard: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  sectionHeaderAction: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  rowText: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  switchWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: Spacing.one,
  },
  details: {
    gap: Spacing.one,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  optionCentered: {
    justifyContent: 'center',
  },
  numberInput: {
    minWidth: 96,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  configureButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalCard: {
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  modalBlock: {
    gap: Spacing.one,
  },
  modalCentered: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  timeButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    minWidth: 140,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  outlineButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});






