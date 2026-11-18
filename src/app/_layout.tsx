import { Cinzel_700Bold, Cinzel_900Black } from '@expo-google-fonts/cinzel';
import {
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Oswald_500Medium, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { cores } from '@/theme';

export default function RootLayout() {
  const [fontesCarregadas, erroFontes] = useFonts({
    Cinzel_700Bold,
    Cinzel_900Black,
    Oswald_500Medium,
    Oswald_700Bold,
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Se as fontes demorarem (ex.: internet lenta no navegador), abre assim mesmo
  // com as fontes do aparelho em vez de ficar na tela escura.
  const [cansou, setCansou] = useState(false);
  useEffect(() => {
    const espera = setTimeout(() => setCansou(true), 4000);
    return () => clearTimeout(espera);
  }, []);

  // Enquanto as fontes carregam, mostra só o fundo escuro.
  if (!fontesCarregadas && !erroFontes && !cansou) {
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
      />
    </>
  );
}

// Se alguma tela quebrar, mostra o erro em vez de uma tela vazia.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ color: cores.texto, fontSize: 18 }}>Algo deu errado ao abrir o app.</Text>
      <Text style={{ color: cores.textoSuave, fontSize: 14 }}>{error.message}</Text>
      <Text onPress={retry} style={{ color: cores.douradoClaro, fontSize: 16, marginTop: 8 }}>
        Tentar de novo
      </Text>
    </View>
  );
}
