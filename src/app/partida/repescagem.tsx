import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { HabitatTag } from '@/components/HabitatTag';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { Rotulo } from '@/components/Rotulo';
import { buscarPersonagem } from '@/data/personagens';
import { vagas } from '@/partida/leilao';
import { buscarJogador, formatarReais, salvarPartida, usePartida } from '@/partida/partida';
import {
  custoRepescagem,
  escolherPersonagem,
  iniciarRepescagem,
  jogadorDaVez,
  passarVez,
} from '@/partida/repescagem';
import { cores, fontes } from '@/theme';

// Repescagem (SCRUM-23): depois do leilão, quem ainda tem vaga escolhe entre os
// personagens sem dono. Quem tem mais dinheiro escolhe primeiro.
export default function Repescagem() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const terminou = partida !== null && partida.repescagem.length === 0 && !partida.pendente;
  const semOrdem = partida !== null && !terminou && !partida.distribuicao;

  useEffect(() => {
    if (terminou) router.replace('/partida/times');
  }, [terminou]);

  // A ordem (e o dado do desempate) é sorteada uma vez só, ao entrar.
  useEffect(() => {
    if (semOrdem && partida) salvarPartida(iniciarRepescagem(partida));
  }, [semOrdem, partida]);

  const vez = partida ? jogadorDaVez(partida) : null;

  if (!partida || !partida.distribuicao || !vez) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Repescagem" />
      </View>
    );
  }

  const { ordem, dados } = partida.distribuicao;
  const custo = custoRepescagem(vez);
  const naFila = ordem
    .map((id) => buscarJogador(partida, id)!)
    .filter((j) => vagas(j) > 0);

  function escolher() {
    if (!partida || !selecionado) return;
    salvarPartida(escolherPersonagem(partida, selecionado));
    setSelecionado(null);
    router.push('/partida/registrar');
  }

  function passar() {
    if (!partida) return;
    const nova = passarVez(partida);
    setSelecionado(null);
    salvarPartida(nova);
    // Todos passaram: o personagem já tem dono e vai para o registro.
    if (nova.pendente) router.push('/partida/registrar');
  }

  const desempate = dados
    ? Object.entries(dados)
        .map(([id, valores]) => `${buscarJogador(partida, Number(id))?.nome} ${valores.join('→')}`)
        .join(' · ')
    : null;

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Repescagem" subtitulo={`Vez de ${vez.nome}`} />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.vez}>
          <Avatar jogadorId={vez.id} texto={vez.nome.charAt(0).toUpperCase()} />
          <View style={styles.flex}>
            <Text style={styles.vezNome} numberOfLines={1}>
              {vez.nome} escolhe
            </Text>
            <Text style={styles.vezDetalhe}>
              Saldo {formatarReais(vez.saldo)} · {custo > 0 ? `custa ${formatarReais(custo)}` : 'grátis com saldo zero'}
            </Text>
          </View>
        </View>

        <Rotulo>Personagens sem dono</Rotulo>
        {partida.repescagem.map((codigo) => {
          const p = buscarPersonagem(codigo)!;
          const ativo = codigo === selecionado;
          return (
            <View key={codigo} style={[styles.carta, ativo && styles.cartaAtiva]}>
              <Pressable
                onPress={() => setSelecionado(codigo)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                style={styles.cartaEscolha}
              >
                <View style={styles.cartaTopo}>
                  <ImagemPersonagem codigo={codigo} style={styles.imagem} />
                  <View style={styles.flex}>
                    <Text style={styles.nome} numberOfLines={2}>
                      {p.nome}
                    </Text>
                    <Text style={styles.codigo}>{p.codigo}</Text>
                    <View style={styles.habitats}>
                      {p.habitats.map((h) => (
                        <HabitatTag key={h} habitat={h} />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.descricao}>“{p.descricao}”</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/personagens/[codigo]', params: { codigo } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.atributos, pressed && styles.atributosPressionado]}
              >
                <Text style={styles.atributosTexto}>Ver atributos</Text>
              </Pressable>
            </View>
          );
        })}

        <Rotulo>Ordem de escolha</Rotulo>
        <View style={styles.fila}>
          {naFila.map((j) => (
            <View key={j.id} style={[styles.jogador, j.id === vez.id && styles.jogadorVez]}>
              <Avatar jogadorId={j.id} texto={j.nome.charAt(0).toUpperCase()} tamanho={26} />
              <View style={styles.flex}>
                <Text style={styles.jogadorNome} numberOfLines={1}>
                  {j.nome}
                </Text>
                <Text style={styles.jogadorSaldo}>
                  {formatarReais(j.saldo)} · {vagas(j)} {vagas(j) === 1 ? 'vaga' : 'vagas'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {desempate ? <Text style={styles.legenda}>Desempate no dado, o maior vem primeiro: {desempate}</Text> : null}
        <Text style={styles.legenda}>Se todos passarem, o personagem fica com quem tem menos dinheiro.</Text>
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: bottom + 16 }]}>
        <Botao
          titulo={selecionado ? `${vez.nome} escolhe` : 'Toque em um personagem'}
          onPress={escolher}
          desativado={!selecionado}
          style={styles.flex}
        />
        <Botao titulo="Não quero" variante="secundario" onPress={passar} style={styles.secundario} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  flex: {
    flex: 1,
  },
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  vez: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: 'rgba(140,107,31,0.35)',
  },
  vezNome: {
    fontFamily: fontes.textoForte,
    fontSize: 16,
    color: cores.texto,
  },
  vezDetalhe: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.douradoClaro,
  },
  carta: {
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.douradoEscuro,
    backgroundColor: cores.painel,
  },
  cartaAtiva: {
    borderWidth: 2,
    borderColor: cores.dourado,
    backgroundColor: cores.painelClaro,
  },
  cartaEscolha: {
    gap: 10,
  },
  cartaTopo: {
    flexDirection: 'row',
    gap: 12,
  },
  imagem: {
    width: 84,
    height: 84,
    borderRadius: 10,
  },
  nome: {
    fontFamily: fontes.titulo,
    fontSize: 16,
    color: cores.douradoClaro,
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 13,
    letterSpacing: 0.78,
    color: cores.textoSuave,
    marginTop: 2,
  },
  habitats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  descricao: {
    fontFamily: fontes.textoItalico,
    fontSize: 13,
    lineHeight: 19,
    color: cores.textoSuave,
  },
  atributos: {
    height: 32,
    borderRadius: 8,
    backgroundColor: cores.painelClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atributosPressionado: {
    backgroundColor: cores.douradoEscuro,
  },
  atributosTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
  },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jogador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '48.8%',
    flexGrow: 1,
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.douradoEscuro,
    backgroundColor: cores.painel,
  },
  jogadorVez: {
    borderWidth: 2,
    borderColor: cores.dourado,
    backgroundColor: cores.painelClaro,
  },
  jogadorNome: {
    fontFamily: fontes.textoMedio,
    fontSize: 14,
    color: cores.texto,
  },
  jogadorSaldo: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
  },
  legenda: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  rodape: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  secundario: {
    width: 124,
    paddingHorizontal: 6,
  },
});
