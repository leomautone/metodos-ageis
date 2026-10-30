import { Cinzel_700Bold, Cinzel_900Black } from '@expo-google-fonts/cinzel';
import {
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Oswald_500Medium, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { cores } from '@/theme';

export default function RootLayout() {
  const [fontesCarregadas] = useFonts({
    Cinzel_700Bold,
    Cinzel_900Black,
    Oswald_500Medium,
    Oswald_700Bold,
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Enquanto as fontes carregam, mostra só o fundo escuro.
  if (!fontesCarregadas) {
    return <View style={{ flex: 1, backgroundColor: cores.fundo }} />;
  }

  // Cada tela desenha o próprio cabeçalho (componente Cabecalho), como no Figma.
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Screen name="partida/registrar" options={{ gestureEnabled: false }} />
        <Stack.Screen name="personagens/ler" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
