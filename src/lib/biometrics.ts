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

export async function getBiometricAvailability() {
  if (Platform.OS === 'web') {
    return { supported: false, enrolled: false };
  }
  try {
    const LocalAuthentication = await getLocalAuthModule();
    if (!LocalAuthentication) {
      return { supported: false, enrolled: false };
    }
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = supported ? await LocalAuthentication.isEnrolledAsync() : false;
    return { supported, enrolled };
  } catch {
    return { supported: false, enrolled: false };
  }
}

export async function canUseBiometrics(): Promise<boolean> {
  const availability = await getBiometricAvailability();
  return availability.supported && availability.enrolled;
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

