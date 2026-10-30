import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Botao } from '@/components/Botao';
import { Cabecalho } from '@/components/Cabecalho';
import { Cronometro } from '@/components/Cronometro';
import { HabitatTag } from '@/components/HabitatTag';
import { ImagemPersonagem } from '@/components/ImagemPersonagem';
import { buscarPersonagem } from '@/data/personagens';
import {
  encerrarPersonagem,
  lanceMinimo,
  leilaoConcluido,
  MAX_REPESCAGEM,
  podeDarLance,
  TEMPO_APOS_LANCE_MS,
  TEMPO_INICIAL_MS,
  vagas,
  type Lance,
} from '@/partida/leilao';
import { buscarJogador, formatarReais, salvarPartida, TAMANHO_TIME, usePartida } from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Leilão (SCRUM-21): personagem da vez, cronômetro 15 s / 5 s, lances e saldo de cada jogador.
// Quem leva o personagem segue para o registro da carta (QR).
export default function Leilao() {
  const partida = usePartida();
  const { bottom } = useSafeAreaInsets();
  const [lance, setLance] = useState<Lance | null>(null);
  const [valor, setValor] = useState(0);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [fimEm, setFimEm] = useState<number | null>(null);
  const [duracao, setDuracao] = useState(TEMPO_INICIAL_MS);
  const [agora, setAgora] = useState(Date.now());
  const [aviso, setAviso] = useState<string | null>(null);

  // Atualiza o cronômetro várias vezes por segundo enquanto ele corre.
  useEffect(() => {
    if (fimEm === null) return;
    const intervalo = setInterval(() => setAgora(Date.now()), 100);
    return () => clearInterval(intervalo);
  }, [fimEm]);

  useEffect(() => {
    if (fimEm !== null && agora >= fimEm) encerrar();
  });

  const concluido = partida !== null && leilaoConcluido(partida) && !partida.pendente;
  useEffect(() => {
    if (concluido) router.replace('/partida/times');
  }, [concluido]);

  if (!partida || concluido) {
    return (
      <View style={styles.tela}>
        <Cabecalho titulo="Leilão" />
        {!partida ? (
          <View style={styles.vazio}>
            <Text style={styles.legenda}>Nenhuma partida em andamento.</Text>
            <Botao titulo="Nova partida" onPress={() => router.replace('/partida/nova')} />
          </View>
        ) : null}
      </View>
    );
  }

  const p = buscarPersonagem(partida.fila[partida.indiceAtual])!;
  const correndo = fimEm !== null;
  const minimo = lanceMinimo(lance);
  const valorAtual = Math.max(valor, minimo);
  const restanteMs = correndo ? Math.max(0, fimEm - agora) : TEMPO_INICIAL_MS;
  const segundos = Math.ceil(restanteMs / 1000);
  const lider = buscarJogador(partida, lance?.jogadorId ?? null);
  const quemDa = buscarJogador(partida, selecionado);
  const podeDar = quemDa ? podeDarLance(quemDa, valorAtual, lance) : false;

  function iniciar() {
    setAviso(null);
    setAgora(Date.now());
    setDuracao(TEMPO_INICIAL_MS);
    setFimEm(Date.now() + TEMPO_INICIAL_MS);
  }

  function darLance() {
    if (!quemDa || !podeDar) return;
    setLance({ jogadorId: quemDa.id, valor: valorAtual });
    setValor(valorAtual + 1);
    setSelecionado(null);
    // Cada lance novo reinicia o cronômetro em 5 s.
    setAgora(Date.now());
    setDuracao(TEMPO_APOS_LANCE_MS);
    setFimEm(Date.now() + TEMPO_APOS_LANCE_MS);
  }

  function encerrar() {
    if (!partida) return;
    const { partida: nova, venda } = encerrarPersonagem(partida, lance);
    setFimEm(null);
    setLance(null);
    setValor(0);
    setSelecionado(null);
    salvarPartida(nova);
    if (venda.jogadorId !== null) {
      router.push('/partida/registrar');
    } else {
      setAviso(`${p.nome} ficou sem lance e foi para a repescagem (${nova.repescagem.length}/${MAX_REPESCAGEM}).`);
    }
  }

  return (
    <View style={styles.tela}>
      <Cabecalho titulo="Leilão" subtitulo={`Personagem ${partida.indiceAtual + 1} de ${partida.fila.length}`} />

      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.carta}>
          <ImagemPersonagem codigo={p.codigo} style={styles.imagem} />
          <View style={styles.cartaTexto}>
            <Text style={styles.nome} numberOfLines={2}>
              {p.nome}
            </Text>
            <Text style={styles.codigo}>{p.codigo}</Text>
            <View style={styles.habitats}>
              {p.habitats.map((h) => (
                <HabitatTag key={h} habitat={h} tamanho={24} />
              ))}
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/personagens/[codigo]', params: { codigo: p.codigo } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.atributos, pressed && styles.atributosPressionado]}
            >
              <Text style={styles.atributosTexto}>Ver atributos</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.relogio}>
          <Cronometro segundos={segundos} fracao={correndo ? restanteMs / duracao : 1} urgente={correndo && segundos <= 2} />
          <Text style={styles.legenda}>
            {correndo ? 'Cada lance volta o relógio para 5 s' : 'O relógio começa com 15 s'}
          </Text>
        </View>

        {aviso ? (
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>{aviso}</Text>
          </View>
        ) : null}

        <View style={styles.lanceAtual}>
          <View>
            <Text style={styles.lanceRotulo}>LANCE ATUAL</Text>
            <Text style={styles.lanceValor}>{lance ? formatarReais(lance.valor) : '—'}</Text>
          </View>
          <Text style={styles.lanceNome}>{lider ? lider.nome : 'sem lances'}</Text>
        </View>

        <View style={styles.grade}>
          {partida.jogadores.map((j) => {
            const valido = correndo && podeDarLance(j, valorAtual, lance);
            const ativo = j.id === selecionado;
            const livres = vagas(j);
            return (
              <Pressable
                key={j.id}
                disabled={!valido}
                onPress={() => setSelecionado(j.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo, disabled: !valido }}
                style={[styles.jogador, ativo && styles.jogadorAtivo, correndo && !valido && styles.jogadorInativo]}
              >
                <Avatar jogadorId={j.id} texto={j.nome.charAt(0).toUpperCase()} tamanho={34} />
                <View style={styles.jogadorTexto}>
                  <Text style={styles.jogadorNome} numberOfLines={1}>
                    {j.nome}
                  </Text>
                  <View style={styles.saldoLinha}>
                    <Text style={styles.saldo}>{formatarReais(j.saldo)}</Text>
                    <View style={styles.pontos} accessibilityLabel={`${livres} vagas`}>
                      {Array.from({ length: TAMANHO_TIME }, (_, i) => (
                        <View key={i} style={[styles.ponto, i < livres && styles.pontoCheio]} />
                      ))}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {correndo ? (
          <View style={styles.valorLinha}>
            <Pressable
              onPress={() => setValor(Math.max(minimo, valorAtual - 1))}
              disabled={valorAtual <= minimo}
              accessibilityRole="button"
              accessibilityLabel="Diminuir lance"
              style={[styles.passo, valorAtual <= minimo && styles.inativo]}
            >
              <Text style={styles.passoTexto}>−</Text>
            </Pressable>
            <View style={styles.valor}>
              <Text style={styles.valorTexto}>{formatarReais(valorAtual)}</Text>
            </View>
            <Pressable
              onPress={() => setValor(valorAtual + 1)}
              accessibilityRole="button"
              accessibilityLabel="Aumentar lance"
              style={styles.passo}
            >
              <Text style={styles.passoTexto}>+</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: bottom + 16 }]}>
        {correndo ? (
          <Botao
            titulo={quemDa ? `${quemDa.nome} dá lance` : 'Toque em quem dá lance'}
            onPress={darLance}
            desativado={!podeDar}
            style={styles.flex}
          />
        ) : (
          <Botao titulo="Começar" onPress={iniciar} style={styles.flex} />
        )}
        <Botao titulo={lance ? 'Vender' : 'Sem lance'} variante="secundario" onPress={encerrar} style={styles.secundario} />
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
  vazio: {
    padding: 24,
    gap: 16,
  },
  conteudo: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
  },
  carta: {
    flexDirection: 'row',
    gap: 14,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: cores.dourado,
    backgroundColor: cores.painel,
  },
  imagem: {
    width: 130,
    height: 130,
    borderRadius: 10,
  },
  cartaTexto: {
    flex: 1,
    paddingTop: 6,
  },
  nome: {
    fontFamily: fontes.titulo,
    fontSize: 18,
    color: cores.douradoClaro,
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 13,
    letterSpacing: 0.78,
    color: cores.textoSuave,
    marginTop: 4,
  },
  habitats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  atributos: {
    height: 30,
    borderRadius: 8,
    backgroundColor: cores.painelClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  atributosPressionado: {
    backgroundColor: cores.douradoEscuro,
  },
  atributosTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.douradoClaro,
  },
  relogio: {
    alignItems: 'center',
    gap: 10,
  },
  legenda: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
  },
  aviso: {
    backgroundColor: cores.painelClaro,
    borderColor: cores.habitat.ar,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avisoTexto: {
    fontFamily: fontes.textoMedio,
    fontSize: 13,
    color: cores.texto,
    textAlign: 'center',
  },
  lanceAtual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: 'rgba(140,107,31,0.35)',
  },
  lanceRotulo: {
    fontFamily: fontes.numero,
    fontSize: 12,
    letterSpacing: 0.96,
    color: cores.douradoClaro,
  },
  lanceValor: {
    fontFamily: fontes.numeroForte,
    fontSize: 24,
    lineHeight: 30,
    color: cores.douradoClaro,
  },
  lanceNome: {
    fontFamily: fontes.textoForte,
    fontSize: 16,
    color: cores.texto,
  },
  grade: {
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
    height: 62,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.douradoEscuro,
    backgroundColor: cores.painel,
  },
  jogadorAtivo: {
    borderWidth: 2,
    borderColor: cores.dourado,
    backgroundColor: cores.painelClaro,
  },
  jogadorInativo: {
    opacity: 0.45,
  },
  jogadorTexto: {
    flex: 1,
  },
  jogadorNome: {
    fontFamily: fontes.textoMedio,
    fontSize: 15,
    color: cores.texto,
  },
  saldoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saldo: {
    fontFamily: fontes.numeroForte,
    fontSize: 15,
    color: cores.dourado,
  },
  pontos: {
    flexDirection: 'row',
    gap: 4,
  },
  ponto: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: cores.painelClaro,
  },
  pontoCheio: {
    backgroundColor: cores.douradoClaro,
  },
  valorLinha: {
    flexDirection: 'row',
    gap: 8,
  },
  passo: {
    width: 64,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.dourado,
    backgroundColor: cores.painel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inativo: {
    opacity: 0.4,
  },
  passoTexto: {
    fontFamily: fontes.numeroForte,
    fontSize: 26,
    color: cores.douradoClaro,
  },
  valor: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: cores.painelClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorTexto: {
    fontFamily: fontes.numeroForte,
    fontSize: 26,
    color: cores.douradoClaro,
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
