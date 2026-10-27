import { Cinzel_400Regular, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Oswald_500Medium } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { cores, fontes } from '@/theme';

export default function RootLayout() {
  const [fontesCarregadas] = useFonts({
    Cinzel_400Regular,
    Cinzel_700Bold,
    Oswald_500Medium,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  // Enquanto as fontes carregam, mostra só o fundo escuro.
  if (!fontesCarregadas) {
    return <View style={{ flex: 1, backgroundColor: cores.fundo }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: cores.fundo },
          headerTintColor: cores.douradoClaro,
          headerTitleStyle: { fontFamily: fontes.titulo },
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="personagens/index" options={{ title: 'Personagens' }} />
        <Stack.Screen name="partida/nova" options={{ title: 'Nova partida' }} />
        <Stack.Screen name="partida/leilao" options={{ title: 'Leilão' }} />
      </Stack>
    </>
  );
}
