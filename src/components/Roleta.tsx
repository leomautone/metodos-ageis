import { useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Painel } from '@/components/Painel';
import { Roda } from '@/components/Roda';
import { formatarReais, type Jogador } from '@/partida/partida';
import { sortearGiro } from '@/partida/roleta';
import { corDoJogador, cores, fontes } from '@/theme';

type Props = {
  visivel: boolean;
  // Nome da carta em jogo.
  carta: string;
  // Por que houve sorteio, ex.: "Repescagem cheia e empate em vagas".
  motivo: string;
  // Os empatados, um por fatia.
  jogadores: Jogador[];
  // Valor que quem cair vai pagar (R$ 1, ou zero para quem não tem saldo).
  valor: (jogador: Jogador) => number;
  onConfirmar: (jogadorId: number) => void;
  onCancelar: () => void;
};

// Roleta do desempate: quem tocar gira, e todos veem em quem ela para.
// Depois de girar não dá para girar de novo nem cancelar, só confirmar.
export function Roleta({ visivel, carta, motivo, jogadores, valor, onConfirmar, onCancelar }: Props) {
  const rotacao = useRef(0);
  const sorteado = useRef(0);
  const [alvo, setAlvo] = useState<number | null>(null);
  const [fase, setFase] = useState<'pronta' | 'girando' | 'parou'>('pronta');
  const [vencedor, setVencedor] = useState<Jogador | null>(null);

  function girar() {
    if (fase !== 'pronta') return;
    const resultado = sortearGiro(rotacao.current, jogadores.length);
    rotacao.current = resultado.rotacao;
    sorteado.current = resultado.indice;
    setFase('girando');
    setAlvo(resultado.rotacao);
  }

  function parou() {
    setVencedor(jogadores[sorteado.current]);
    setFase('parou');
  }

  function fechar(acao: () => void) {
    setFase('pronta');
    setVencedor(null);
    acao();
  }

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (fase === 'pronta') fechar(onCancelar);
      }}
    >
      <View style={styles.fundo}>
        <Painel style={styles.painel}>
          <Text style={styles.titulo}>Roleta da sorte</Text>
          <Text style={styles.texto}>
            {motivo}: a roleta decide quem fica com {carta}.
          </Text>

          <Roda
            fatias={jogadores.map((j) => ({ chave: String(j.id), rotulo: j.nome, cor: corDoJogador(j.id), peso: 1 }))}
            alvo={alvo}
            onParou={parou}
            onPress={girar}
            desativado={fase !== 'pronta'}
          />

          {fase === 'parou' && vencedor ? (
            <View style={styles.resultado}>
              <Text style={styles.caiu}>Caiu em {vencedor.nome}!</Text>
              <Text style={styles.texto}>
                Leva {carta} por {formatarReais(valor(vencedor))}.
              </Text>
            </View>
          ) : (
            <Text style={styles.dica}>{fase === 'girando' ? 'Girando…' : 'Toque na roleta ou em Girar'}</Text>
          )}

          {fase === 'parou' && vencedor ? (
            <Botao titulo="Confirmar" onPress={() => fechar(() => onConfirmar(vencedor.id))} />
          ) : (
            <View style={styles.botoes}>
              <Botao titulo="Girar" onPress={girar} desativado={fase !== 'pronta'} style={styles.flex} />
              <Botao
                titulo="Cancelar"
                variante="secundario"
                onPress={() => fechar(onCancelar)}
                desativado={fase !== 'pronta'}
                style={styles.cancelar}
              />
            </View>
          )}
        </Painel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(11,10,16,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  painel: {
    gap: 12,
    alignItems: 'stretch',
  },
  flex: {
    flex: 1,
  },
  titulo: {
    fontFamily: fontes.titulo,
    fontSize: 22,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
  texto: {
    fontFamily: fontes.texto,
    fontSize: 14,
    lineHeight: 20,
    color: cores.texto,
    textAlign: 'center',
  },
  resultado: {
    alignItems: 'center',
    gap: 2,
  },
  caiu: {
    fontFamily: fontes.tituloPreto,
    fontSize: 26,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
  dica: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  botoes: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelar: {
    width: 124,
    paddingHorizontal: 6,
  },
});
