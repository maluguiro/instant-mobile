import { Platform } from 'react-native';

let cachedModule: typeof import('expo-local-authentication') | null = null;

async function getLocalAuthModule() {
  if (cachedModule) return cachedModule;
  try {
    cachedModule = require('expo-local-authentication');
    return cachedModule;
  } catch {
    return null;
  }
}

export async function canUseBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const LocalAuthentication = await getLocalAuthModule();
    if (!LocalAuthentication) return false;
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics() {
  if (Platform.OS === 'web') {
    return { success: false };
  }
  try {
    const LocalAuthentication = await getLocalAuthModule();
    if (!LocalAuthentication) return { success: false };
    return await LocalAuthentication.authenticateAsync({
      promptMessage: 'Ingresar con biometría',
      fallbackLabel: 'Usar contraseña',
    });
  } catch {
    return { success: false };
  }
}
