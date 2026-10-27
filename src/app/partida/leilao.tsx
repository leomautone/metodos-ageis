import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { HabitatTag } from '@/components/HabitatTag';
import { Painel } from '@/components/Painel';
import { buscarPersonagem } from '@/data/personagens';
import {
  encerrarPersonagem,
  lanceMinimo,
  leilaoConcluido,
  podeDarLance,
  TEMPO_APOS_LANCE_MS,
  TEMPO_INICIAL_MS,
  vagas,
  type Lance,
} from '@/partida/leilao';
import { formatarReais, salvarPartida, usePartida, type Partida, type Venda } from '@/partida/partida';
import { cores, fontes } from '@/theme';

// Leilão (SCRUM-21): personagem da vez, cronômetro 15 s / 5 s, lances,
// saldo de cada jogador e registro do vencedor e do valor.
export default function Leilao() {
  const partida = usePartida();
  const [lance, setLance] = useState<Lance | null>(null);
  const [valor, setValor] = useState(0);
  const [fimEm, setFimEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const [resultado, setResultado] = useState<Venda | null>(null);

  // Atualiza o cronômetro várias vezes por segundo enquanto ele corre.
  useEffect(() => {
    if (fimEm === null) return;
    const intervalo = setInterval(() => setAgora(Date.now()), 200);
    return () => clearInterval(intervalo);
  }, [fimEm]);

  const restanteMs = fimEm === null ? TEMPO_INICIAL_MS : Math.max(0, fimEm - agora);

  useEffect(() => {
    if (fimEm !== null && agora >= fimEm) encerrar();
  });

  if (!partida) {
    return (
      <View style={[styles.tela, styles.conteudo]}>
        <Text style={styles.texto}>Nenhuma partida em andamento.</Text>
        <Botao titulo="Nova partida" onPress={() => router.replace('/partida/nova')} />
      </View>
    );
  }

  function iniciar() {
    setAgora(Date.now());
    setFimEm(Date.now() + TEMPO_INICIAL_MS);
  }

  function darLance(jogadorId: number) {
    const valorLance = Math.max(valor, lanceMinimo(lance));
    setLance({ jogadorId, valor: valorLance });
    setValor(valorLance + 1);
    // Cada lance novo reinicia o cronômetro em 5 s.
    setAgora(Date.now());
    setFimEm(Date.now() + TEMPO_APOS_LANCE_MS);
  }

  function encerrar() {
    if (!partida) return;
    const fechado = encerrarPersonagem(partida, lance);
    setFimEm(null);
    setResultado(fechado.venda);
    salvarPartida(fechado.partida);
  }

  function proximo() {
    setResultado(null);
    setLance(null);
    setValor(0);
  }

  if (resultado) {
    return <Resultado partida={partida} venda={resultado} onProximo={proximo} />;
  }

  if (leilaoConcluido(partida)) {
    return <Resumo partida={partida} />;
  }

  const p = buscarPersonagem(partida.fila[partida.indiceAtual])!;
  const correndo = fimEm !== null;
  const minimo = lanceMinimo(lance);
  const segundos = Math.ceil(restanteMs / 1000);
  const lider = partida.jogadores.find((j) => j.id === lance?.jogadorId);

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Text style={styles.posicao}>
        Personagem {partida.indiceAtual + 1} de {partida.fila.length} · repescagem{' '}
        {partida.repescagem.length}/3
      </Text>

      <Painel style={styles.carta}>
        <Text style={styles.codigo}>{p.codigo}</Text>
        <Text style={styles.nome}>{p.nome}</Text>
        <View style={styles.habitats}>
          {p.habitats.map((h) => (
            <HabitatTag key={h} habitat={h} />
          ))}
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/personagens/[codigo]', params: { codigo: p.codigo } })}
        >
          <Text style={styles.link}>ver atributos e habilidade</Text>
        </Pressable>
      </Painel>

      <View style={styles.placar}>
        <View style={styles.placarItem}>
          <Text style={styles.rotulo}>TEMPO</Text>
          <Text style={[styles.relogio, correndo && segundos <= 3 && styles.relogioUrgente]}>
            {segundos}s
          </Text>
        </View>
        <View style={styles.placarItem}>
          <Text style={styles.rotulo}>LANCE ATUAL</Text>
          <Text style={styles.lanceValor}>{lance ? formatarReais(lance.valor) : '—'}</Text>
          <Text style={styles.lanceNome}>{lider ? lider.nome : 'sem lances'}</Text>
        </View>
      </View>

      {!correndo ? (
        <Botao titulo="Iniciar cronômetro" detalhe="15 segundos" onPress={iniciar} />
      ) : (
        <>
          <Painel style={styles.bloco}>
            <Text style={styles.titulo}>Valor do lance</Text>
            <View style={styles.seletor}>
              <Pressable
                onPress={() => setValor(Math.max(minimo, valor - 1))}
                style={styles.passo}
                hitSlop={6}
              >
                <Text style={styles.passoTexto}>−</Text>
              </Pressable>
              <Text style={styles.valor}>{formatarReais(Math.max(valor, minimo))}</Text>
              <Pressable onPress={() => setValor(Math.max(valor, minimo) + 1)} style={styles.passo} hitSlop={6}>
                <Text style={styles.passoTexto}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.ajuda}>Toque no jogador que deu o lance.</Text>
          </Painel>
          <Botao titulo="Bater o martelo" detalhe="encerrar agora" onPress={encerrar} />
        </>
      )}

      <Painel style={styles.bloco}>
        <Text style={styles.titulo}>Jogadores</Text>
        {partida.jogadores.map((j) => {
          const valido = correndo && podeDarLance(j, Math.max(valor, minimo), lance);
          const liderando = j.id === lance?.jogadorId;
          return (
            <Pressable
              key={j.id}
              disabled={!valido}
              onPress={() => darLance(j.id)}
              style={({ pressed }) => [
                styles.jogador,
                liderando && styles.jogadorLider,
                valido && styles.jogadorValido,
                pressed && styles.jogadorPressionado,
              ]}
            >
              <View style={styles.flex}>
                <Text style={styles.jogadorNome}>{j.nome}</Text>
                <Text style={styles.ajuda}>
                  {vagas(j) === 0 ? 'time completo' : `${vagas(j)} vaga(s)`}
                </Text>
              </View>
              <Text style={styles.saldo}>{formatarReais(j.saldo)}</Text>
            </Pressable>
          );
        })}
      </Painel>
    </ScrollView>
  );
}

function Resultado({ partida, venda, onProximo }: { partida: Partida; venda: Venda; onProximo: () => void }) {
  const p = buscarPersonagem(venda.codigo)!;
  const nome = (id: number) => partida.jogadores.find((j) => j.id === id)!.nome;
  const ultimo = leilaoConcluido(partida);

  let titulo: string;
  let detalhe: string;
  if (venda.tipo === 'lance') {
    titulo = `Vendido para ${nome(venda.jogadorId!)}`;
    detalhe = venda.valor === 0 ? 'Lance de R$ 0 sem disputa: leva de graça.' : `por ${formatarReais(venda.valor)}`;
  } else if (venda.tipo === 'repescagem') {
    titulo = 'Sem lance';
    detalhe = `Vai para a repescagem (${partida.repescagem.length}/3).`;
  } else {
    titulo = `Sem lance → ${nome(venda.jogadorId!)}`;
    detalhe = `Repescagem cheia: vai para quem tem mais vagas, por ${formatarReais(venda.valor)}.`;
  }

  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Painel style={styles.carta}>
        <Text style={styles.codigo}>{p.codigo}</Text>
        <Text style={styles.nome}>{p.nome}</Text>
        <Text style={styles.martelo}>{titulo}</Text>
        <Text style={styles.texto}>{detalhe}</Text>
        {venda.dados ? (
          <View style={styles.dados}>
            <Text style={styles.ajuda}>Desempate no dado (menor fica com ele):</Text>
            {Object.entries(venda.dados).map(([id, valores]) => (
              <Text key={id} style={styles.texto}>
                {nome(Number(id))}: {valores.join(' → ')}
              </Text>
            ))}
          </View>
        ) : null}
      </Painel>
      <Botao titulo={ultimo ? 'Ver times' : 'Próximo personagem'} onPress={onProximo} />
    </ScrollView>
  );
}

function Resumo({ partida }: { partida: Partida }) {
  return (
    <ScrollView style={styles.tela} contentContainerStyle={styles.conteudo}>
      <Text style={styles.martelo}>Leilão encerrado</Text>
      {partida.jogadores.map((j) => (
        <Painel key={j.id} style={styles.bloco}>
          <View style={styles.linha}>
            <Text style={[styles.titulo, styles.flex]}>{j.nome}</Text>
            <Text style={styles.saldo}>{formatarReais(j.saldo)}</Text>
          </View>
          {j.time.length === 0 ? <Text style={styles.ajuda}>Nenhum personagem ainda.</Text> : null}
          {j.time.map((codigo) => {
            const venda = partida.vendas.find((v) => v.codigo === codigo)!;
            return (
              <View key={codigo} style={styles.linha}>
                <Text style={styles.codigo}>{codigo}</Text>
                <Text style={[styles.texto, styles.flex, styles.esquerda]}>{buscarPersonagem(codigo)!.nome}</Text>
                <Text style={styles.ajuda}>{formatarReais(venda.valor)}</Text>
              </View>
            );
          })}
        </Painel>
      ))}
      {partida.repescagem.length > 0 ? (
        <Painel style={styles.bloco}>
          <Text style={styles.titulo}>Repescagem</Text>
          {partida.repescagem.map((codigo) => (
            <View key={codigo} style={styles.linha}>
              <Text style={styles.codigo}>{codigo}</Text>
              <Text style={[styles.texto, styles.flex, styles.esquerda]}>{buscarPersonagem(codigo)!.nome}</Text>
            </View>
          ))}
          <Text style={styles.ajuda}>A distribuição da repescagem chega na próxima versão.</Text>
        </Painel>
      ) : null}
      <Botao titulo="Voltar ao início" onPress={() => router.dismissTo('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  flex: {
    flex: 1,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  posicao: {
    fontFamily: fontes.textoForte,
    fontSize: 12,
    color: cores.textoSuave,
    textAlign: 'center',
    letterSpacing: 1,
  },
  carta: {
    alignItems: 'center',
    paddingVertical: 22,
    gap: 6,
  },
  codigo: {
    fontFamily: fontes.numero,
    fontSize: 14,
    color: cores.dourado,
    letterSpacing: 1,
  },
  nome: {
    fontFamily: fontes.titulo,
    fontSize: 24,
    color: cores.douradoClaro,
    textAlign: 'center',
  },
  habitats: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  link: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.dourado,
    textDecorationLine: 'underline',
    marginTop: 6,
  },
  placar: {
    flexDirection: 'row',
    gap: 12,
  },
  placarItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: cores.painel,
    borderColor: cores.dourado,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
  },
  rotulo: {
    fontFamily: fontes.textoForte,
    fontSize: 11,
    color: cores.textoSuave,
    letterSpacing: 2,
  },
  relogio: {
    fontFamily: fontes.numero,
    fontSize: 44,
    color: cores.douradoClaro,
  },
  relogioUrgente: {
    color: '#E07A6A',
  },
  lanceValor: {
    fontFamily: fontes.numero,
    fontSize: 30,
    color: cores.douradoClaro,
    marginTop: 6,
  },
  lanceNome: {
    fontFamily: fontes.texto,
    fontSize: 13,
    color: cores.texto,
  },
  bloco: {
    gap: 10,
  },
  titulo: {
    fontFamily: fontes.titulo,
    fontSize: 16,
    color: cores.dourado,
  },
  seletor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  passo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: cores.dourado,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoTexto: {
    fontFamily: fontes.numero,
    fontSize: 22,
    color: cores.douradoClaro,
  },
  valor: {
    fontFamily: fontes.numero,
    fontSize: 30,
    color: cores.douradoClaro,
    minWidth: 110,
    textAlign: 'center',
  },
  ajuda: {
    fontFamily: fontes.texto,
    fontSize: 12,
    color: cores.textoSuave,
  },
  jogador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: cores.desativado,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    opacity: 0.6,
  },
  jogadorValido: {
    borderColor: cores.dourado,
    opacity: 1,
  },
  jogadorLider: {
    backgroundColor: '#3A3220',
    borderColor: cores.douradoClaro,
    opacity: 1,
  },
  jogadorPressionado: {
    backgroundColor: cores.dourado,
  },
  jogadorNome: {
    fontFamily: fontes.textoForte,
    fontSize: 15,
    color: cores.texto,
  },
  saldo: {
    fontFamily: fontes.numero,
    fontSize: 17,
    color: cores.douradoClaro,
  },
  martelo: {
    fontFamily: fontes.titulo,
    fontSize: 20,
    color: cores.dourado,
    textAlign: 'center',
    marginTop: 10,
  },
  texto: {
    fontFamily: fontes.texto,
    fontSize: 14,
    color: cores.texto,
    textAlign: 'center',
  },
  esquerda: {
    textAlign: 'left',
  },
  dados: {
    marginTop: 8,
    alignItems: 'center',
    gap: 2,
  },
});
