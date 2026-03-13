let hasSeenOnboarding = false;

export function getHasSeenOnboarding() {
  return hasSeenOnboarding;
}

export function setHasSeenOnboarding(value: boolean) {
  hasSeenOnboarding = value;
}

// TODO: replace with AsyncStorage or SecureStore persistence when backend is ready.
