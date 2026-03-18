import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { setBiometricsEnabled, signOut } from '@/lib/auth';
import { canUseBiometrics } from '@/lib/biometrics';

export default function AccountScreen() {
  const theme = useTheme();
  const { user, loading, biometricsEnabled } = useAuth();
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsToggle, setBiometricsToggle] = useState(biometricsEnabled);

  useEffect(() => {
    canUseBiometrics().then(setBiometricsAvailable);
  }, []);

  useEffect(() => {
    setBiometricsToggle(biometricsEnabled);
  }, [biometricsEnabled]);

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Querés cerrar sesión en Instant?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="subtitle">Cuenta</ThemedText>
        <ThemedText themeColor="textSecondary">
          Guardá tu información y preparate para respaldo y sincronización.
        </ThemedText>
      </View>

      <Card variant="soft" style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <SectionHeader title="Estado de sesión" />
          <Pill label={user ? 'Activa' : 'Sin sesión'} tone={user ? 'accent' : 'default'} />
        </View>

        {loading ? (
          <ThemedText type="small" themeColor="textSecondary">
            Revisando tu sesión...
          </ThemedText>
        ) : user ? (
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: theme.brandSoft }]}>
              <ThemedText type="smallBold">{user.name.slice(0, 2).toUpperCase()}</ThemedText>
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="smallBold">{user.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {user.email}
              </ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            No hay una sesión iniciada. Creá una cuenta para respaldar tus datos.
          </ThemedText>
        )}

        {!loading && !user ? (
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push('/login')}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.brand },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={[styles.primaryText, { color: theme.onBrand }]}>
                Iniciar sesión
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.push('/signup')}
              style={({ pressed }) => [
                styles.outlineButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Crear cuenta
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </Card>

      <Card variant="soft" style={styles.securityCard}>
        <SectionHeader title="Acceso rápido" />
        <View style={styles.securityRow}>
          <View style={styles.securityInfo}>
            <ThemedText type="smallBold">Ingresar con huella</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {biometricsAvailable
                ? 'Podés usar biometría en dispositivos compatibles.'
                : 'No hay biometría disponible en este dispositivo.'}
            </ThemedText>
          </View>
          <Switch
            value={biometricsToggle}
            onValueChange={async (value) => {
              if (!biometricsAvailable) {
                Alert.alert(
                  'Biometría no disponible',
                  'Tu dispositivo no tiene biometría configurada.'
                );
                return;
              }
              setBiometricsToggle(value);
              await setBiometricsEnabled(value);
            }}
            trackColor={{ false: theme.border, true: theme.brandSoft }}
            thumbColor={biometricsToggle ? theme.brand : theme.textSecondary}
          />
        </View>
      </Card>

      <Card variant="soft" style={styles.syncCard}>
        <SectionHeader title="Respaldo y sincronización" />
        <ThemedText type="small" themeColor="textSecondary">
          Estamos preparando el respaldo automático para tus movimientos, metas y calendario.
        </ThemedText>
        <View style={styles.syncRow}>
          <View>
            <ThemedText type="smallBold">Instant Cloud</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Próximamente disponible
            </ThemedText>
          </View>
          <Pill label="Próximamente" tone="accent" />
        </View>
      </Card>

      {user ? (
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.outlineButton,
            { borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Cerrar sesión
          </ThemedText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  statusCard: {
    gap: Spacing.three,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    gap: 2,
  },
  actions: {
    gap: Spacing.two,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
  },
  outlineButton: {
    paddingVertical: Spacing.two,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryText: {
    fontSize: 15,
  },
  syncCard: {
    gap: Spacing.two,
  },
  securityCard: {
    gap: Spacing.two,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  securityInfo: {
    flex: 1,
    gap: 2,
  },
  syncRow: {
    marginTop: Spacing.one,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});

