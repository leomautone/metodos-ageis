import { describe, expect, it } from '@jest/globals';

import {
  alcanca,
  calcularChances,
  chanceDeVitoria,
  criarAleatorio,
  criarLutador,
  melhorAtaque,
  poderEfetivo,
  simularBatalha,
  zonasDoDuelo,
  type Contexto,
} from '../motor';

const round1: Contexto = { round: 1, final: false, condicao: null };
const final: Contexto = { round: 'final', final: true, condicao: null };

// Dois times com o personagem de cada lado e um companheiro para não ativar a última resistência.
function duelo(a: string, b: string) {
  const la = criarLutador(a, 1);
  const lb = criarLutador(b, 2);
  const todos = [la, lb, criarLutador('ANI-002', 1), criarLutador('ANI-004', 2)];
  return { la, lb, todos };
}

describe('chance de vitória', () => {
  it('é 50% com Poderes iguais', () => {
    expect(chanceDeVitoria(6, 6)).toBeCloseTo(0.5);
  });

  it('é simétrica e cresce com o Poder', () => {
    expect(chanceDeVitoria(7, 6) + chanceDeVitoria(6, 7)).toBeCloseTo(1);
    expect(chanceDeVitoria(7, 6)).toBeGreaterThan(chanceDeVitoria(6.5, 6));
  });

  it('é 100% com diferença maior que 2,25 de Poder', () => {
    expect(chanceDeVitoria(9, 6.7)).toBe(1);
  });
});

describe('zonas e alcance', () => {
  it('duela no habitat em comum, com +1 em casa', () => {
    const { la, lb, todos } = duelo('ANI-005', 'ANI-011'); // Tigre x Leão, ambos terra
    expect(zonasDoDuelo(la, lb, round1)).toEqual(['terra']);
    expect(poderEfetivo(lb, la, 'terra', 'alvo', round1, todos).poder).toBeCloseTo(6.7 + 1);
  });

  it('quem voa alcança terra e luta no habitat do alvo, com −2 fora de casa', () => {
    const { la, lb, todos } = duelo('ANI-029', 'ANI-011'); // Águia-real x Leão
    expect(alcanca(la, lb, round1)).toBe(true);
    expect(zonasDoDuelo(la, lb, round1)).toEqual(['terra']);
    // Águia: 5,4 − 2 (fora de casa) + 1 (Visão aguçada contra terra)
    expect(poderEfetivo(la, lb, 'terra', 'atacante', round1, todos).poder).toBeCloseTo(4.4);
  });

  it('terra não alcança quem voa, nem água alcança terra', () => {
    expect(alcanca(criarLutador('ANI-011', 1), criarLutador('ANI-029', 2), round1)).toBe(false);
    expect(alcanca(criarLutador('ANI-010', 1), criarLutador('ANI-011', 2), round1)).toBe(false);
  });

  it('no duelo final todos se alcançam em zona neutra, sem bônus de zona', () => {
    const { la, lb, todos } = duelo('ANI-010', 'ANI-011');
    expect(alcanca(la, lb, final)).toBe(true);
    expect(zonasDoDuelo(la, lb, final)).toEqual(['neutra']);
    expect(poderEfetivo(lb, la, 'neutra', 'alvo', final, todos).poder).toBeCloseTo(6.7 + 1); // Rei: +1
  });
});

describe('habilidades', () => {
  it('primeiroAtaque vale só no primeiro ataque', () => {
    const { la, lb, todos } = duelo('ANI-005', 'ANI-011');
    expect(poderEfetivo(la, lb, 'terra', 'atacante', round1, todos).usadas).toHaveLength(1);
    la.atacou = true;
    expect(poderEfetivo(la, lb, 'terra', 'atacante', round1, todos).usadas).toHaveLength(0);
    expect(poderEfetivo(la, lb, 'terra', 'alvo', round1, todos).usadas).toHaveLength(0);
  });

  it('quandoAtacado vale só como alvo', () => {
    const { la, lb, todos } = duelo('ANI-006', 'ANI-011');
    expect(poderEfetivo(la, lb, 'terra', 'alvo', round1, todos).poder).toBeCloseTo(7.1 + 1 + 1);
    expect(poderEfetivo(la, lb, 'terra', 'atacante', round1, todos).poder).toBeCloseTo(7.1 + 1);
  });

  it('contraHabitat vale contra quem tem o habitat', () => {
    const { la, lb, todos } = duelo('ANI-007', 'ANI-014'); // Urso-cinzento x Hipopótamo (terra e água)
    expect(poderEfetivo(la, lb, 'terra', 'atacante', round1, todos).poder).toBeCloseTo(6.9 + 1 + 1);
  });

  it('contraPersonagens vale só contra os personagens listados', () => {
    const { la, lb, todos } = duelo('ANI-030', 'ANI-024'); // Texugo x Sucuri
    expect(poderEfetivo(la, lb, 'terra', 'atacante', round1, todos).poder).toBeCloseTo(5.4 + 1 + 2);
    const outro = duelo('ANI-030', 'ANI-011');
    expect(poderEfetivo(outro.la, outro.lb, 'terra', 'atacante', round1, outro.todos).poder).toBeCloseTo(6.4);
  });

  it('extraNaAgua soma ao bônus de casa só na água', () => {
    const { la, lb, todos } = duelo('ANI-012', 'ANI-014'); // Crocodilo x Hipopótamo
    expect(poderEfetivo(la, lb, 'agua', 'atacante', round1, todos).poder).toBeCloseTo(6.8 + 1 + 1);
    expect(poderEfetivo(la, lb, 'terra', 'atacante', round1, todos).poder).toBeCloseTo(6.8 + 1);
  });

  it('o atacante escolhe a zona em comum que for melhor para ele', () => {
    const { la, todos } = duelo('ANI-012', 'ANI-014');
    expect(melhorAtaque(la, todos, round1)?.zona).toBe('agua');
  });

  it('ultimoDoTime soma com a última resistência', () => {
    const la = criarLutador('ANI-028', 1); // Carcaju sozinho
    const lb = criarLutador('ANI-011', 2);
    const todos = [la, lb, criarLutador('ANI-004', 2)];
    expect(poderEfetivo(la, lb, 'terra', 'atacante', round1, todos).poder).toBeCloseTo(5.4 + 1 + 1 + 2);
  });

  it('aPartirDoRound3 vale do 3º round em diante e no duelo final', () => {
    const { la, lb, todos } = duelo('ANI-020', 'ANI-011');
    expect(poderEfetivo(la, lb, 'terra', 'atacante', { ...round1, round: 2 }, todos).usadas).toHaveLength(0);
    expect(poderEfetivo(la, lb, 'terra', 'atacante', { ...round1, round: 3 }, todos).usadas).toHaveLength(1);
    expect(poderEfetivo(la, lb, 'neutra', 'atacante', final, todos).usadas).toHaveLength(1);
  });

  it('duelofinal vale só no duelo final', () => {
    const { la, lb, todos } = duelo('ANI-011', 'ANI-005');
    expect(poderEfetivo(la, lb, 'terra', 'atacante', round1, todos).usadas).toHaveLength(0);
    expect(poderEfetivo(la, lb, 'neutra', 'atacante', final, todos).usadas).toHaveLength(1);
  });

  it('alcancaVoadores alcança quem voa, lutando no ar', () => {
    const { la, lb } = duelo('ANI-019', 'ANI-021'); // Puma x Harpia
    expect(alcanca(la, lb, round1)).toBe(true);
    expect(zonasDoDuelo(la, lb, round1)).toEqual(['ar']);
  });

  it('esquivaPrimeiroAtaque faz o 1º ataque falhar e conta como 1º ataque do atacante', () => {
    // Tigre (time 1) contra Canguru sozinho (time 2): o tigre ataca e cai na esquiva.
    const resultado = simularBatalha(
      [
        { jogadorId: 1, codigos: ['ANI-005'] },
        { jogadorId: 2, codigos: ['ANI-017'] },
      ],
      criarAleatorio(1),
    );
    const esquivas = resultado.eventos.filter((e) => e.tipo === 'esquiva');
    expect(esquivas).toHaveLength(1);
    expect(esquivas[0].alvo).toBe('ANI-017');
    // O ataque seguinte do tigre já não tem Emboscada.
    const duelosDoTigre = resultado.eventos.filter((e) => e.tipo === 'duelo' && e.atacante === 'ANI-005');
    for (const d of duelosDoTigre) expect(d.habilidades_usadas).not.toContain('Emboscada: +1 no 1º ataque');
  });

  it('veneno enfraquece quem sobrevive ao venenoso, mesmo que ele perca', () => {
    for (let semente = 1; semente < 50; semente++) {
      const r = simularBatalha(
        [
          { jogadorId: 1, codigos: ['ANI-002', 'ANI-001'] }, // Elefante e Orca
          { jogadorId: 2, codigos: ['ANI-026', 'ANI-004'] }, // Komodo e Cachalote
        ],
        criarAleatorio(semente),
      );
      const morteKomodo = r.eventos.find((e) => e.tipo === 'duelo' && e.eliminado === 'ANI-026');
      if (morteKomodo) {
        expect(morteKomodo.habilidades_usadas).toContain('Veneno: quem lutar com ele fica −1');
        return;
      }
    }
    throw new Error('Nenhuma simulação eliminou o Komodo');
  });
});

describe('batalha completa', () => {
  const times = [
    { jogadorId: 1, codigos: ['ANI-011', 'ANI-027', 'ANI-017'] },
    { jogadorId: 2, codigos: ['ANI-013', 'ANI-022', 'ANI-014'] },
    { jogadorId: 3, codigos: ['ANI-019', 'ANI-010', 'ANI-016'] },
    { jogadorId: 4, codigos: ['ANI-009', 'ANI-024', 'ANI-025'] },
  ];

  it('a mesma semente repete a mesma batalha', () => {
    expect(simularBatalha(times, criarAleatorio(42))).toEqual(simularBatalha(times, criarAleatorio(42)));
  });

  it('termina com um vencedor e o evento "vencedor" no fim', () => {
    for (let semente = 1; semente <= 30; semente++) {
      const r = simularBatalha(times, criarAleatorio(semente));
      expect(r.vencedor).not.toBeNull();
      expect(r.sobreviventes.length).toBeGreaterThan(0);
      expect(r.eventos.at(-1)?.tipo).toBe('vencedor');
      const rounds = r.eventos.map((e) => e.round).filter((x) => typeof x === 'number') as number[];
      expect(Math.max(0, ...rounds)).toBeLessThanOrEqual(5);
    }
  });

  it('no duelo final a arena fecha e sai uma condição entre os habitats vivos', () => {
    let viu = false;
    for (let semente = 1; semente <= 50 && !viu; semente++) {
      const r = simularBatalha(times, criarAleatorio(semente));
      const condicao = r.eventos.find((e) => e.tipo === 'condicao_final');
      if (condicao) {
        viu = true;
        expect(r.eventos.find((e) => e.tipo === 'arena_fecha')?.round).toBe('final');
        expect(['terra', 'agua', 'ar']).toContain(condicao.zona);
      }
    }
    expect(viu).toBe(true);
  });

  it('anuncia a última resistência quando sobra um no time', () => {
    const r = simularBatalha(times, criarAleatorio(7));
    for (const e of r.eventos.filter((x) => x.tipo === 'ultima_resistencia')) {
      expect(e.atacante).toBeTruthy();
      expect(e.time).toBeTruthy();
    }
  });

  it('marca zebra quando vence quem tinha menos Poder efetivo', () => {
    for (let semente = 1; semente <= 30; semente++) {
      for (const e of simularBatalha(times, criarAleatorio(semente)).eventos) {
        if (e.tipo !== 'duelo' || !e.poder) continue;
        const atacanteVenceu = e.eliminado === e.alvo;
        const [pa, pb] = e.poder;
        expect(e.zebra).toBe(atacanteVenceu ? pa < pb : pb < pa);
      }
    }
  });

  it('um time só termina na hora', () => {
    const r = simularBatalha([{ jogadorId: 1, codigos: ['ANI-001'] }, { jogadorId: 2, codigos: [] }], criarAleatorio(1));
    expect(r.vencedor).toBe(1);
    expect(r.eventos.filter((e) => e.tipo === 'duelo')).toHaveLength(0);
  });

  it('as chances das 2.000 simulações somam 100%', () => {
    const chances = calcularChances(times);
    const soma = Object.values(chances).reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(1);
  });
});
