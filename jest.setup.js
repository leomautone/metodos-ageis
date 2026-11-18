// Mocks globais dos testes.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-audio usa um módulo nativo que não existe no Jest.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    isLoaded: false,
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));
