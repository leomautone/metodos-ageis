# All-in Draft — AP2 de Métodos Ágeis (Ibmec 2026.2)

App juiz do jogo "All-in Draft" (tema Animais): leilão de personagens, registro por QR code e cálculo da batalha entre os times.

## Como rodar

1. Instale o Node 22 ou mais novo.
2. `npm install`
3. `npx expo start`
4. Abra o app **Expo Go** no celular e leia o QR code que aparece no terminal (o celular precisa estar na mesma rede Wi-Fi do computador).

## Stack

React Native + Expo (SDK 58) com TypeScript, Expo Router para as telas, AsyncStorage para salvar a partida e Jest para os testes do motor de batalha.
