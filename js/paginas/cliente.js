import { api, sessao } from "../api.js";
import {
  ROTULOS_FORMA,
  abrirModal,
  avisar,
  cpfFormatado,
  dataBR,
  dataHoraBR,
  diaSemana,
  duracao,
  esc,
  estrelas,
  executar,
  hora,
  moeda,
  selo,
  sigla,
  vazio,
} from "../ui.js";
import { configPublica } from "./publico.js";

const PERFIL = ["cliente"];

function lerSelecao() {
  try {
    return JSON.parse(sessionStorage.getItem("mv-selecao"));
  } catch {
    return null;
  }
}

function resumoVoo(v) {
  return `
    <div class="entre">
      <div>
        <div class="suave pequeno">${esc(diaSemana(v.partida))} · ${esc(v.companhia)} · voo ${esc(v.voo_codigo || v.codigo)}</div>
        <div class="voo-horas mt">
          <div><div class="hora">${hora(v.partida)}</div><div class="suave pequeno">${esc(v.origem)}</div></div>
          <div class="voo-linha"><span>${duracao(v.partida, v.chegada)}</span></div>
          <div><div class="hora">${hora(v.chegada)}</div><div class="suave pequeno">${esc(v.destino)}</div></div>
        </div>
      </div>
    </div>`;
}

function blocoPassageiro(indice, padrao = {}) {
  return `
    <div class="grade grade-3 ${indice ? "mt" : ""}" data-passageiro>
      <div class="campo"><label>Passageiro ${indice + 1} · nome completo</label><input name="nome" value="${esc(padrao.nome || "")}" required></div>
      <div class="campo"><label>CPF</label><input name="cpf" value="${esc(cpfFormatado(padrao.cpf || ""))}" inputmode="numeric" required></div>
      <div class="campo"><label>Nascimento</label><input type="date" name="nascimento"></div>
    </div>`;
}

async function reservar(alvo) {
  const selecao = lerSelecao();
  if (!selecao) {
    alvo.innerHTML = `<div class="cartao">${vazio("Nenhum voo selecionado.")}<div class="acoes" style="justify-content:center"><a class="botao" href="#/">Buscar voos</a></div></div>`;
    return;
  }
  const { voo, passageiros, promocao } = selecao;
  const [eu, config] = await Promise.all([api("/me"), configPublica()]);
  const dia = voo.partida.slice(0, 10);
  const saida = new Date(dia + "T12:00:00");
  saida.setDate(saida.getDate() + 3);
  const estado = {
    hotel: null,
    checkin: dia,
    checkout: saida.toISOString().slice(0, 10),
    quartos: 1,
    forma: "cartao",
    cupom: null,
    pontos: 0,
    hoteis: [],
  };

  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Finalizar reserva</h1><p>${esc(voo.origem)} → ${esc(voo.destino)} · ${passageiros} passageiro(s)</p></div>
    ${eu.bloqueado ? `<div class="alerta erro mb">Sua conta está bloqueada para novas reservas. Fale com o atendimento.</div>` : ""}
    <div class="colunas">
      <div>
        <div class="cartao">${resumoVoo(voo)}</div>
        <div class="cartao">
          <h2>Passageiros</h2>
          <p class="suave pequeno">Use os nomes exatamente como no documento. Isso evita problemas no embarque.</p>
          <form data-passageiros>${Array.from({ length: passageiros }, (_, i) => blocoPassageiro(i, i === 0 ? eu : {})).join("")}</form>
        </div>
        <div class="cartao">
          <h2>Hospedagem</h2>
          <p class="suave pequeno">Opcional. Hotéis parceiros em ${esc(voo.destino)}.</p>
          <div class="grade grade-3 mt">
            <div class="campo"><label>Check-in</label><input type="date" data-hotel-campo="checkin" min="${dia}" value="${estado.checkin}"></div>
            <div class="campo"><label>Check-out</label><input type="date" data-hotel-campo="checkout" min="${dia}" value="${estado.checkout}"></div>
            <div class="campo"><label>Quartos</label><input type="number" data-hotel-campo="quartos" min="1" max="9" value="1"></div>
          </div>
          <div class="grade mt" data-hoteis></div>
        </div>
        <div class="cartao">
          <h2>Pagamento</h2>
          <div class="grade grade-3 mt" data-formas>
            <label class="opcao-cartao ativo" data-forma="cartao"><input type="radio" name="forma" value="cartao" checked><span><strong>Cartão</strong><br><span class="suave pequeno">Aprovação imediata</span></span></label>
            <label class="opcao-cartao" data-forma="pix"><input type="radio" name="forma" value="pix"><span><strong>Pix</strong><br><span class="suave pequeno">Aprovação imediata</span></span></label>
            <label class="opcao-cartao" data-forma="boleto"><input type="radio" name="forma" value="boleto"><span><strong>Boleto</strong><br><span class="suave pequeno">Até 2 dias úteis</span></span></label>
          </div>
          <form class="grade grade-2 mt" data-cartao>
            <div class="campo"><label>Número do cartão</label><input name="numero" inputmode="numeric" placeholder="0000 0000 0000 0000" autocomplete="cc-number"></div>
            <div class="campo"><label>Nome impresso</label><input name="nome" autocomplete="cc-name"></div>
            <div class="campo"><label>Validade (MM/AA)</label><input name="validade" placeholder="12/29" autocomplete="cc-exp"></div>
            <div class="campo"><label>CVV</label><input name="cvv" inputmode="numeric" maxlength="4" autocomplete="cc-csc"></div>
          </form>
          <div class="alerta mt" data-info-pix hidden>Ao confirmar, o pagamento via Pix é aprovado na hora e seu bilhete é emitido automaticamente.</div>
          <div class="alerta aviso mt" data-info-boleto hidden>A reserva fica pendente até a compensação do boleto (até 2 dias úteis). O bilhete é emitido após a confirmação pela nossa equipe.</div>
        </div>
        <div class="cartao">
          <h2>Descontos</h2>
          <div class="grade grade-2 mt">
            <div class="campo">
              <label>Cupom</label>
              <div class="acoes" style="flex-wrap:nowrap"><input data-cupom placeholder="Ex.: BEMVINDO10"><button class="botao secundario" data-aplicar-cupom>Aplicar</button></div>
            </div>
            <div class="campo">
              <label>Usar pontos (saldo ${eu.pontos.toLocaleString("pt-BR")})</label>
              <div class="acoes" style="flex-wrap:nowrap"><input type="number" min="0" max="${eu.pontos}" value="0" data-pontos><button class="botao secundario" data-max-pontos>Máximo</button></div>
            </div>
          </div>
          <p class="suave pequeno mt">Cada ponto vale ${moeda(config.valor_ponto)}. Pontos cobrem até ${config.limite_desconto_pontos}% do valor.</p>
        </div>
      </div>
      <aside class="cartao fixo">
        <h2>Resumo</h2>
        <div data-resumo></div>
        <button class="botao grande cheio mt" data-confirmar ${eu.bloqueado ? "disabled" : ""}>Confirmar e pagar</button>
        <p class="suave pequeno mt">Cancelamento sem custo até ${config.prazo_cancelamento_horas}h antes do voo. Depois, multa de ${config.multa_percentual}%.</p>
      </aside>
    </div>`;

  const noites = () => Math.round((new Date(estado.checkout) - new Date(estado.checkin)) / 86400000);

  const calcular = () => {
    const voos = voo.preco * passageiros;
    const hotel = estado.hotel && noites() > 0 ? estado.hotel.diaria * noites() * estado.quartos : 0;
    const subtotal = voos + hotel;
    const descontoPromocao = promocao ? subtotal * promocao.desconto / 100 : 0;
    let base = subtotal - descontoPromocao;
    const descontoCupom = estado.cupom ? base * estado.cupom.desconto / 100 : 0;
    base -= descontoCupom;
    const limite = base * config.limite_desconto_pontos / 100;
    const pontos = Math.max(0, Math.min(estado.pontos, eu.pontos, Math.floor(limite / config.valor_ponto)));
    const descontoPontos = pontos * config.valor_ponto;
    base -= descontoPontos;
    const comissao = base * config.comissao / 100;
    return { voos, hotel, subtotal, descontoPromocao, descontoCupom, pontos, descontoPontos, comissao, total: base + comissao };
  };

  const desenharResumo = () => {
    const v = calcular();
    alvo.querySelector("[data-resumo]").innerHTML = `
      <div class="resumo-linha"><span>Passagens (${passageiros}×)</span><span>${moeda(v.voos)}</span></div>
      <div class="resumo-linha"><span>${estado.hotel ? `${esc(estado.hotel.nome)} · ${noites()} noite(s)` : "Sem hotel"}</span><span>${moeda(v.hotel)}</span></div>
      ${v.descontoPromocao ? `<div class="resumo-linha desconto"><span>${esc(promocao.descricao)} (${promocao.desconto}%)</span><span>− ${moeda(v.descontoPromocao)}</span></div>` : ""}
      ${v.descontoCupom ? `<div class="resumo-linha desconto"><span>Cupom ${esc(estado.cupom.codigo)}</span><span>− ${moeda(v.descontoCupom)}</span></div>` : ""}
      ${v.descontoPontos ? `<div class="resumo-linha desconto"><span>${v.pontos} pontos</span><span>− ${moeda(v.descontoPontos)}</span></div>` : ""}
      <div class="resumo-linha"><span>Taxa de serviço (${config.comissao}%)</span><span>${moeda(v.comissao)}</span></div>
      <div class="resumo-linha total"><span>Total</span><span>${moeda(v.total)}</span></div>
      <div class="suave pequeno">Você ganha ~${Math.floor(v.total * config.pontos_por_real).toLocaleString("pt-BR")} pontos</div>`;
  };

  const desenharHoteis = () => {
    const caixa = alvo.querySelector("[data-hoteis]");
    const opcaoSem = `<label class="opcao-cartao ${!estado.hotel ? "ativo" : ""}" data-hotel=""><input type="radio" name="hotel" ${!estado.hotel ? "checked" : ""}><span><strong>Somente passagem aérea</strong></span></label>`;
    caixa.innerHTML = opcaoSem + estado.hoteis.map((h) => {
      const esgotado = h.disponiveis !== undefined && h.disponiveis < estado.quartos;
      return `
        <label class="opcao-cartao ${estado.hotel?.id === h.id ? "ativo" : ""}" data-hotel="${h.id}" ${esgotado ? 'style="opacity:.5"' : ""}>
          <input type="radio" name="hotel" ${estado.hotel?.id === h.id ? "checked" : ""} ${esgotado ? "disabled" : ""}>
          <span style="flex:1">
            <span class="entre"><strong>${esc(h.nome)}</strong><span class="forte">${moeda(h.diaria)}<span class="suave pequeno"> /noite</span></span></span>
            <span class="suave pequeno">${estrelas(h.estrelas)} · ${esc(h.endereco || "")} · ${h.disponiveis !== undefined ? (esgotado ? "Sem quartos suficientes" : `${h.disponiveis} quarto(s) livre(s)`) : ""}</span>
          </span>
        </label>`;
    }).join("");
    if (!estado.hoteis.length) caixa.insertAdjacentHTML("beforeend", `<p class="suave pequeno">Ainda não temos hotéis parceiros neste destino.</p>`);
    caixa.querySelectorAll("[data-hotel]").forEach((opcao) =>
      opcao.addEventListener("click", (e) => {
        if (opcao.querySelector("input").disabled) return;
        e.preventDefault();
        estado.hotel = estado.hoteis.find((h) => String(h.id) === opcao.dataset.hotel) || null;
        desenharHoteis();
        desenharResumo();
      })
    );
  };

  const carregarHoteis = async () => {
    const parametros = new URLSearchParams({ cidade: voo.destino });
    if (noites() > 0) parametros.set("checkin", estado.checkin), parametros.set("checkout", estado.checkout);
    estado.hoteis = await api("/hoteis?" + parametros);
    if (estado.hotel) estado.hotel = estado.hoteis.find((h) => h.id === estado.hotel.id) || null;
    desenharHoteis();
    desenharResumo();
  };

  alvo.querySelectorAll("[data-hotel-campo]").forEach((campo) =>
    campo.addEventListener("change", () => {
      estado[campo.dataset.hotelCampo] = campo.dataset.hotelCampo === "quartos" ? Math.max(1, Number(campo.value) || 1) : campo.value;
      carregarHoteis().catch((e) => avisar(e.message, "erro"));
    })
  );

  alvo.querySelectorAll("[data-forma]").forEach((opcao) =>
    opcao.addEventListener("click", () => {
      estado.forma = opcao.dataset.forma;
      alvo.querySelectorAll("[data-forma]").forEach((o) => {
        o.classList.toggle("ativo", o === opcao);
        o.querySelector("input").checked = o === opcao;
      });
      alvo.querySelector("[data-cartao]").hidden = estado.forma !== "cartao";
      alvo.querySelector("[data-info-pix]").hidden = estado.forma !== "pix";
      alvo.querySelector("[data-info-boleto]").hidden = estado.forma !== "boleto";
    })
  );

  alvo.querySelector("[data-aplicar-cupom]").addEventListener("click", (e) => {
    const codigo = alvo.querySelector("[data-cupom]").value.trim();
    if (!codigo) {
      estado.cupom = null;
      desenharResumo();
      return;
    }
    executar(e.currentTarget, async () => {
      estado.cupom = await api("/cupons/validar", { metodo: "POST", corpo: { codigo } });
      avisar(`Cupom ${estado.cupom.codigo} aplicado: ${estado.cupom.desconto}% de desconto.`, "sucesso");
      desenharResumo();
    });
  });

  const campoPontos = alvo.querySelector("[data-pontos]");
  campoPontos.addEventListener("input", () => {
    estado.pontos = Math.max(0, Number(campoPontos.value) || 0);
    desenharResumo();
  });
  alvo.querySelector("[data-max-pontos]").addEventListener("click", () => {
    estado.pontos = eu.pontos;
    campoPontos.value = calcular().pontos;
    estado.pontos = Number(campoPontos.value);
    desenharResumo();
  });

  alvo.querySelector("[data-confirmar]").addEventListener("click", (e) => {
    const passageirosLista = Array.from(alvo.querySelectorAll("[data-passageiro]")).map((bloco) => ({
      nome: bloco.querySelector("[name=nome]").value,
      cpf: bloco.querySelector("[name=cpf]").value,
      nascimento: bloco.querySelector("[name=nascimento]").value || null,
    }));
    const cartao = Object.fromEntries(new FormData(alvo.querySelector("[data-cartao]")));
    const corpo = {
      voo: voo.ref,
      passageiros: passageirosLista,
      hotel: estado.hotel ? { id: estado.hotel.id, checkin: estado.checkin, checkout: estado.checkout, quartos: estado.quartos } : null,
      pagamento: { forma: estado.forma, cartao: estado.forma === "cartao" ? cartao : null },
      cupom: estado.cupom?.codigo || null,
      pontos: calcular().pontos,
    };
    executar(e.currentTarget, async () => {
      const reserva = await api("/reservas", { metodo: "POST", corpo });
      try {
        sessionStorage.removeItem("mv-selecao");
      } catch {}
      avisar(reserva.status === "confirmada" ? "Pagamento aprovado! Bilhete emitido." : "Reserva registrada. Pague o boleto para confirmar.", "sucesso");
      location.hash = "#/reserva/" + reserva.id;
    });
  });

  desenharResumo();
  await carregarHoteis();
}

function cartaoReserva(r) {
  return `
    <a class="cartao oferta" href="#/reserva/${r.id}" style="display:block;color:inherit">
      <div class="entre"><span class="suave pequeno">${esc(r.codigo)} · ${esc(diaSemana(r.partida))} ${hora(r.partida)}</span>${selo(r.status)}</div>
      <h3 class="mt">${esc(r.origem)} → ${esc(r.destino)}</h3>
      <div class="entre">
        <span class="suave pequeno">${r.qtd_passageiros} passageiro(s)${r.hotel ? ` · ${esc(r.hotel)}` : ""}${r.checkin_feito ? " · check-in feito" : ""}</span>
        <span class="forte">${moeda(r.total)}</span>
      </div>
    </a>`;
}

async function minhasViagens(alvo) {
  const reservas = await api("/me/reservas");
  const agora = new Date();
  const grupos = {
    proximas: reservas.filter((r) => r.status !== "cancelada" && new Date(r.partida.replace(" ", "T")) >= agora).reverse(),
    anteriores: reservas.filter((r) => r.status !== "cancelada" && new Date(r.partida.replace(" ", "T")) < agora),
    canceladas: reservas.filter((r) => r.status === "cancelada"),
  };
  let aba = "proximas";
  const desenhar = () => {
    alvo.querySelector("[data-lista]").innerHTML = grupos[aba].length
      ? `<div class="grade grade-2">${grupos[aba].map(cartaoReserva).join("")}</div>`
      : vazio(aba === "proximas" ? "Nenhuma viagem marcada. Que tal planejar a próxima?" : "Nada por aqui.");
    alvo.querySelectorAll("[data-aba]").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === aba));
  };
  alvo.innerHTML = `
    <div class="titulo-pagina entre"><div><h1>Minhas viagens</h1><p>Histórico completo das suas reservas.</p></div><a class="botao" href="#/">Nova viagem</a></div>
    <div class="abas">
      <button data-aba="proximas">Próximas (${grupos.proximas.length})</button>
      <button data-aba="anteriores">Realizadas (${grupos.anteriores.length})</button>
      <button data-aba="canceladas">Canceladas (${grupos.canceladas.length})</button>
    </div>
    <div data-lista></div>`;
  alvo.querySelectorAll("[data-aba]").forEach((b) => b.addEventListener("click", () => ((aba = b.dataset.aba), desenhar())));
  desenhar();
}

async function detalheReserva(alvo, { id }) {
  const r = await api("/reservas/" + id);
  const sim = r.simulacao_cancelamento;
  alvo.innerHTML = `
    <div class="titulo-pagina entre">
      <div><a href="#/minhas-viagens" class="pequeno">← Minhas viagens</a><h1 class="mt">Reserva ${esc(r.codigo)}</h1><p>Localizador ${esc(r.localizador)} · criada em ${dataHoraBR(r.criado_em)}</p></div>
      ${selo(r.status)}
    </div>
    ${r.boleto ? `<div class="alerta aviso mb"><strong>Boleto aguardando pagamento</strong><div class="mt" style="font-family:monospace;word-break:break-all">${esc(r.boleto.linha)}</div><div class="pequeno mt">Valor ${moeda(r.total)} · vencimento ${dataBR(r.boleto.vencimento)}</div></div>` : ""}
    <div class="colunas">
      <div>
        <div class="cartao">${resumoVoo(r)}</div>
        <div class="cartao">
          <h2>Passageiros</h2>
          <div class="tabela-envolta mt"><table>
            <tr><th>Nome</th><th>CPF</th><th>Assento</th><th>Bilhete</th></tr>
            ${r.passageiros.map((p) => `<tr><td>${esc(p.nome)}</td><td>${cpfFormatado(p.cpf)}</td><td>${esc(p.assento || "—")}</td><td>${esc(p.bilhete || "Aguardando pagamento")}</td></tr>`).join("")}
          </table></div>
        </div>
        ${r.hotel ? `<div class="cartao"><h2>Hospedagem</h2><p><strong>${esc(r.hotel)}</strong><br><span class="suave">${esc(r.hotel_endereco || "")}</span></p><p class="suave pequeno">Check-in ${dataBR(r.checkin)} · Check-out ${dataBR(r.checkout)} · ${r.quartos} quarto(s)</p></div>` : ""}
      </div>
      <aside>
        <div class="cartao">
          <h2>Valores</h2>
          <div class="resumo-linha"><span>Passagens</span><span>${moeda(r.preco_voo * r.qtd_passageiros)}</span></div>
          <div class="resumo-linha"><span>Hotel</span><span>${moeda(r.preco_hotel)}</span></div>
          ${r.desconto_promocao ? `<div class="resumo-linha desconto"><span>Promoção</span><span>− ${moeda(r.desconto_promocao)}</span></div>` : ""}
          ${r.desconto_cupom ? `<div class="resumo-linha desconto"><span>Cupom ${esc(r.cupom_codigo)}</span><span>− ${moeda(r.desconto_cupom)}</span></div>` : ""}
          ${r.desconto_pontos ? `<div class="resumo-linha desconto"><span>${r.pontos_usados} pontos</span><span>− ${moeda(r.desconto_pontos)}</span></div>` : ""}
          <div class="resumo-linha"><span>Taxa de serviço</span><span>${moeda(r.comissao)}</span></div>
          <div class="resumo-linha total"><span>Total</span><span>${moeda(r.total)}</span></div>
          <div class="suave pequeno">${ROTULOS_FORMA[r.forma_pagamento]}${r.pago_em ? ` · pago em ${dataHoraBR(r.pago_em)}` : ""}</div>
          ${r.status === "cancelada" ? `<div class="resumo-linha mt"><span>Multa</span><span>${moeda(r.multa)}</span></div><div class="resumo-linha"><span>Reembolso</span><span>${moeda(r.reembolso)}</span></div>` : ""}
          ${r.pontos_ganhos && r.status === "confirmada" ? `<div class="alerta sucesso mt pequeno">+${r.pontos_ganhos.toLocaleString("pt-BR")} pontos creditados</div>` : ""}
        </div>
        <div class="cartao">
          <div class="grade">
            ${r.status === "confirmada" ? `<a class="botao cheio" href="#/bilhete/${r.id}">Emitir bilhete</a>` : ""}
            ${r.pode_checkin ? `<a class="botao secundario cheio" href="#/checkin/${r.id}">${r.checkin_feito ? "Alterar assentos" : "Fazer check-in"}</a>` : ""}
            <a class="botao secundario cheio" href="#/atendimento?reserva=${r.id}">Falar com o atendimento</a>
            ${sim ? `<button class="botao fantasma cheio" data-cancelar style="color:var(--vermelho)">Cancelar reserva</button>` : ""}
          </div>
        </div>
      </aside>
    </div>`;
  alvo.querySelector("[data-cancelar]")?.addEventListener("click", () => {
    const { elemento, fechar } = abrirModal(`
      <h2>Cancelar reserva ${esc(r.codigo)}?</h2>
      ${!r.pago ? `<div class="alerta mt">Esta reserva ainda não foi paga: não há multa nem reembolso.</div>`
        : sim.multa ? `<div class="alerta erro mt">Faltam ${sim.horas_para_voo}h para o voo (prazo gratuito: ${sim.prazo_horas}h). Será cobrada multa.</div>`
        : `<div class="alerta sucesso mt">Cancelamento dentro do prazo: sem multa.</div>`}
      <div class="mt">
        <div class="resumo-linha"><span>Valor pago</span><span>${moeda(r.pago ? r.total : 0)}</span></div>
        <div class="resumo-linha"><span>Multa</span><span>${moeda(sim.multa)}</span></div>
        <div class="resumo-linha total"><span>Reembolso</span><span>${moeda(sim.reembolso)}</span></div>
      </div>
      <p class="suave pequeno mt">Os assentos serão liberados na companhia aérea. Muitos cancelamentos em pouco tempo bloqueiam novas reservas.</p>
      <div class="acoes mt" style="justify-content:flex-end"><button class="botao secundario" data-fechar>Manter reserva</button><button class="botao perigo" data-sim>Confirmar cancelamento</button></div>`);
    elemento.querySelector("[data-sim]").addEventListener("click", (e) =>
      executar(e.currentTarget, async () => {
        const resultado = await api(`/reservas/${r.id}/cancelar`, { metodo: "POST" });
        fechar();
        avisar("Reserva cancelada.", "sucesso");
        if (resultado.cliente_bloqueado) avisar("Sua conta foi bloqueada por excesso de cancelamentos.", "erro");
        detalheReserva(alvo, { id });
      })
    );
  });
}

async function checkin(alvo, { id }) {
  const [r, dados] = await Promise.all([api("/reservas/" + id), api(`/reservas/${id}/assentos`)]);
  const escolhas = Object.fromEntries(dados.passageiros.map((p) => [p.id, p.assento]));
  let ativo = dados.passageiros[0].id;
  const desenhar = () => {
    const meus = new Set(Object.values(escolhas).filter(Boolean));
    alvo.querySelector("[data-pax]").innerHTML = dados.passageiros.map((p) => `
      <button class="opcao-cartao ${p.id === ativo ? "ativo" : ""}" data-p="${p.id}" style="width:100%;text-align:left;font:inherit">
        <span style="flex:1"><strong>${esc(p.nome)}</strong><br><span class="suave pequeno">${escolhas[p.id] ? "Assento " + escolhas[p.id] : "Escolha um assento"}</span></span>
      </button>`).join("");
    alvo.querySelector("[data-mapa]").innerHTML = dados.mapa.map((fileira, i) => `
      <div class="fileira"><span class="numero">${i + 1}</span>${fileira.map((a, j) => `${j === 3 ? '<span class="corredor"></span>' : ""}<button class="assento ${a.ocupado ? "ocupado" : ""} ${escolhas[ativo] === a.assento ? "escolhido" : meus.has(a.assento) ? "outro" : ""}" data-a="${a.assento}" ${a.ocupado ? "disabled" : ""} title="${a.assento}">${a.assento.slice(-1)}</button>`).join("")}</div>`).join("");
    alvo.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => ((ativo = Number(b.dataset.p)), desenhar())));
    alvo.querySelectorAll("[data-a]").forEach((b) =>
      b.addEventListener("click", () => {
        const assento = b.dataset.a;
        Object.keys(escolhas).forEach((k) => escolhas[k] === assento && Number(k) !== ativo && (escolhas[k] = null));
        escolhas[ativo] = assento;
        const proximo = dados.passageiros.find((p) => !escolhas[p.id]);
        if (proximo) ativo = proximo.id;
        desenhar();
      })
    );
  };
  alvo.innerHTML = `
    <div class="titulo-pagina"><a href="#/reserva/${id}" class="pequeno">← Reserva ${esc(r.codigo)}</a><h1 class="mt">Check-in online</h1><p>${esc(r.origem)} → ${esc(r.destino)} · ${dataHoraBR(r.partida)} · voo ${esc(r.voo_codigo)}</p></div>
    <div class="colunas">
      <div class="cartao" style="overflow-x:auto;text-align:center">
        <div class="acoes mb" style="justify-content:center">
          <span class="pequeno"><button class="assento" disabled></button> Livre</span>
          <span class="pequeno"><button class="assento escolhido" disabled></button> Selecionado</span>
          <span class="pequeno"><button class="assento ocupado" disabled></button> Ocupado</span>
        </div>
        <div class="mapa-assentos" data-mapa></div>
      </div>
      <aside class="cartao fixo">
        <h2>Passageiros</h2>
        <div class="grade mt" data-pax></div>
        <button class="botao grande cheio mt" data-salvar>Confirmar check-in</button>
        <p class="suave pequeno mt">Assentos A e F são janela; C e D, corredor. O check-in encerra 1h antes do voo.</p>
      </aside>
    </div>`;
  desenhar();
  alvo.querySelector("[data-salvar]").addEventListener("click", (e) =>
    executar(e.currentTarget, async () => {
      await api(`/reservas/${id}/checkin`, { metodo: "POST", corpo: { assentos: escolhas } });
      avisar("Check-in concluído! Seu cartão de embarque está pronto.", "sucesso");
      location.hash = "#/bilhete/" + id;
    })
  );
}

async function bilhete(alvo, { id }) {
  const r = await api("/reservas/" + id);
  if (r.status !== "confirmada") {
    alvo.innerHTML = `<div class="cartao"><h1>Bilhete indisponível</h1><p class="suave">O bilhete é emitido após a confirmação do pagamento.</p><a class="botao" href="#/reserva/${id}">Voltar à reserva</a></div>`;
    return;
  }
  const partida = new Date(r.partida.replace(" ", "T"));
  const embarque = new Date(partida.getTime() - 40 * 60000);
  alvo.innerHTML = `
    <div class="titulo-pagina entre nao-imprimir">
      <div><a href="#/reserva/${id}" class="pequeno">← Reserva ${esc(r.codigo)}</a><h1 class="mt">Bilhete eletrônico</h1><p>${r.checkin_feito ? "Check-in feito. Apresente este cartão no embarque." : "Bilhete emitido. Faça o check-in para escolher o assento."}</p></div>
      <div class="acoes">${!r.checkin_feito && r.pode_checkin ? `<a class="botao secundario" href="#/checkin/${id}">Fazer check-in</a>` : ""}<button class="botao" data-imprimir>Imprimir / salvar PDF</button></div>
    </div>
    ${r.passageiros.map((p) => `
      <div class="cartao-embarque">
        <div class="faixa"><span>Mundo Viagens · ${r.checkin_feito ? "Cartão de embarque" : "Bilhete eletrônico"}</span><span>${esc(r.companhia)}</span></div>
        <div class="principal">
          <div class="cidades">
            <div><div class="sigla">${sigla(r.origem)}</div><div class="suave pequeno">${esc(r.origem)}</div></div>
            <div class="voo-linha"><span>${duracao(r.partida, r.chegada)}</span></div>
            <div><div class="sigla">${sigla(r.destino)}</div><div class="suave pequeno">${esc(r.destino)}</div></div>
          </div>
          <div class="dados-embarque">
            <div><span class="rotulo">Passageiro</span><strong>${esc(p.nome)}</strong></div>
            <div><span class="rotulo">Voo</span><strong>${esc(r.voo_codigo)}</strong></div>
            <div><span class="rotulo">Data</span><strong>${dataBR(r.partida)}</strong></div>
            <div><span class="rotulo">Partida</span><strong>${hora(r.partida)}</strong></div>
            <div><span class="rotulo">Embarque</span><strong>${String(embarque.getHours()).padStart(2, "0")}:${String(embarque.getMinutes()).padStart(2, "0")}</strong></div>
            <div><span class="rotulo">Assento</span><strong>${esc(p.assento || "—")}</strong></div>
            <div><span class="rotulo">Localizador</span><strong>${esc(r.localizador)}</strong></div>
            <div><span class="rotulo">E-ticket</span><strong>${esc(p.bilhete)}</strong></div>
          </div>
        </div>
        <div class="lado"><div data-qr="${esc(`MV ${r.localizador} ${r.voo_codigo} ${p.bilhete} ${p.assento || "-"}`)}"></div><div class="suave pequeno mt">${esc(r.codigo)}</div></div>
      </div>`).join("")}`;
  const gerarQR = () => {
    if (!window.QRCode) return false;
    alvo.querySelectorAll("[data-qr]").forEach((caixa) => {
      caixa.innerHTML = "";
      try {
        new window.QRCode(caixa, { text: caixa.dataset.qr, width: 116, height: 116, colorDark: "#1e3a8a", colorLight: "#eff6ff", correctLevel: window.QRCode.CorrectLevel.L });
      } catch {
        caixa.innerHTML = `<strong>${esc(caixa.dataset.qr)}</strong>`;
      }
    });
    return true;
  };
  if (!gerarQR()) setTimeout(gerarQR, 800);
  alvo.querySelector("[data-imprimir]").addEventListener("click", () => window.print());
}

async function perfil(alvo) {
  const eu = await api("/me");
  const faixas = [["Bronze", 0], ["Prata", 2000], ["Ouro", 10000]];
  const proxima = faixas.find(([, minimo]) => minimo > eu.pontos);
  const anterior = [...faixas].reverse().find(([, minimo]) => minimo <= eu.pontos);
  const progresso = proxima ? ((eu.pontos - anterior[1]) / (proxima[1] - anterior[1])) * 100 : 100;
  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Meu perfil</h1><p>Cliente desde ${dataBR(eu.criado_em)}</p></div>
    <div class="grade grade-2" style="align-items:start">
      <div>
        <div class="cartao fidelidade">
          <div class="entre"><span class="suave pequeno">Mundo Viagens Pontos</span><span class="selo">${esc(eu.nivel)}</span></div>
          <div class="preco mt" style="color:#fff;font-size:2.2rem">${eu.pontos.toLocaleString("pt-BR")} pts</div>
          <div class="suave">equivalem a ${moeda(eu.valor_pontos)} em descontos</div>
          <div class="progresso mt"><div style="width:${progresso}%"></div></div>
          <div class="suave pequeno mt">${proxima ? `Faltam ${(proxima[1] - eu.pontos).toLocaleString("pt-BR")} pontos para o nível ${proxima[0]}` : "Você está no nível máximo!"}</div>
        </div>
        ${eu.bloqueado ? `<div class="alerta erro mt">Sua conta está bloqueada para novas reservas. Fale com o atendimento.</div>` : ""}
      </div>
      <form class="cartao grade" data-perfil>
        <h2>Dados pessoais</h2>
        <div class="campo"><label>Nome completo</label><input name="nome" value="${esc(eu.nome)}" required></div>
        <div class="grade grade-2">
          <div class="campo"><label>CPF</label><input value="${cpfFormatado(eu.cpf)}" disabled></div>
          <div class="campo"><label>Celular</label><input name="telefone" value="${esc(eu.telefone || "")}"></div>
        </div>
        <div class="campo"><label>E-mail</label><input value="${esc(eu.email)}" disabled></div>
        <h3 class="mt">Alterar senha</h3>
        <div class="grade grade-2">
          <div class="campo"><label>Senha atual</label><input type="password" name="senha_atual" autocomplete="current-password"></div>
          <div class="campo"><label>Nova senha</label><input type="password" name="nova_senha" minlength="6" autocomplete="new-password"></div>
        </div>
        <button class="botao" type="submit">Salvar alterações</button>
      </form>
    </div>`;
  const form = alvo.querySelector("[data-perfil]");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    executar(form.querySelector("button"), async () => {
      const atualizado = await api("/me", { metodo: "PUT", corpo: Object.fromEntries(new FormData(form)) });
      sessao.atualizarUsuario(atualizado);
      window.dispatchEvent(new Event("atualizar-menu"));
      avisar("Dados atualizados.", "sucesso");
      form.senha_atual.value = "";
      form.nova_senha.value = "";
    });
  });
}

async function notificacoes(alvo) {
  const itens = await api("/me/notificacoes");
  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Notificações</h1><p>Atualizações sobre suas reservas e sua conta.</p></div>
    <div class="cartao">${itens.length ? `<ul class="lista-simples">${itens.map((n) => `
      <li><div class="entre"><strong>${n.lida ? "" : "● "}${esc(n.titulo)}</strong><span class="suave pequeno">${dataHoraBR(n.criado_em)}</span></div><div class="suave">${esc(n.mensagem)}</div></li>`).join("")}</ul>` : vazio("Nenhuma notificação.")}</div>`;
  if (itens.some((n) => !n.lida)) {
    await api("/me/notificacoes/lidas", { metodo: "POST" });
    window.dispatchEvent(new Event("atualizar-menu"));
  }
}

const ASSUNTOS = ["Alteração de reserva", "Bagagem", "Reembolso", "Pagamento", "Dúvida sobre hotel", "Outro assunto"];

async function atendimento(alvo, _, query) {
  const [chamados, reservas] = await Promise.all([api("/me/chamados"), api("/me/reservas")]);
  alvo.innerHTML = `
    <div class="titulo-pagina entre"><div><h1>Atendimento</h1><p>Fale com a nossa equipe e acompanhe as respostas.</p></div><button class="botao" data-novo>Novo chamado</button></div>
    <div class="cartao">${chamados.length ? `<ul class="lista-simples">${chamados.map((c) => `
      <li><a href="#/atendimento/${c.id}" class="entre" style="color:inherit"><span><strong>${esc(c.assunto)}</strong><br><span class="suave pequeno">#${c.id}${c.reserva_codigo ? ` · reserva ${esc(c.reserva_codigo)}` : ""} · atualizado ${dataHoraBR(c.atualizado_em)}</span></span>${selo(c.status)}</a></li>`).join("")}</ul>` : vazio("Você ainda não abriu nenhum chamado.")}</div>`;
  const abrir = () => {
    const { elemento, fechar } = abrirModal(`
      <h2>Novo chamado</h2>
      <form class="grade mt" data-chamado>
        <div class="campo"><label>Assunto</label><select name="assunto">${ASSUNTOS.map((a) => `<option>${a}</option>`).join("")}</select></div>
        <div class="campo"><label>Reserva relacionada</label><select name="reserva_id"><option value="">Nenhuma</option>${reservas.map((r) => `<option value="${r.id}" ${String(r.id) === query.reserva ? "selected" : ""}>${esc(r.codigo)} · ${esc(r.origem)} → ${esc(r.destino)} · ${dataBR(r.partida)}</option>`).join("")}</select></div>
        <div class="campo"><label>Mensagem</label><textarea name="mensagem" required placeholder="Conte como podemos ajudar"></textarea></div>
        <div class="acoes" style="justify-content:flex-end"><button type="button" class="botao secundario" data-fechar>Cancelar</button><button class="botao" type="submit">Enviar</button></div>
      </form>`);
    const form = elemento.querySelector("[data-chamado]");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      executar(form.querySelector("[type=submit]"), async () => {
        const dados = Object.fromEntries(new FormData(form));
        const chamado = await api("/me/chamados", { metodo: "POST", corpo: { ...dados, reserva_id: dados.reserva_id || null } });
        fechar();
        avisar("Chamado aberto! Responderemos em breve.", "sucesso");
        location.hash = "#/atendimento/" + chamado.id;
      });
    });
  };
  alvo.querySelector("[data-novo]").addEventListener("click", abrir);
  if (query.reserva) abrir();
}

export function conversa(chamado) {
  return `<div class="mensagens">${chamado.mensagens.map((m) => `
    <div class="mensagem ${m.da_equipe ? "equipe" : "cliente"}"><div class="autor">${esc(m.autor)}${m.da_equipe ? " · Mundo Viagens" : ""} · ${dataHoraBR(m.criado_em)}</div>${esc(m.texto).replace(/\n/g, "<br>")}</div>`).join("")}</div>`;
}

async function verChamado(alvo, { id }) {
  const chamado = await api("/chamados/" + id);
  alvo.innerHTML = `
    <div class="titulo-pagina entre"><div><a href="#/atendimento" class="pequeno">← Atendimento</a><h1 class="mt">${esc(chamado.assunto)}</h1><p>Chamado #${chamado.id}${chamado.reserva_codigo ? ` · reserva ${esc(chamado.reserva_codigo)}` : ""}</p></div>${selo(chamado.status)}</div>
    <div class="cartao" style="max-width:760px">
      ${conversa(chamado)}
      ${chamado.status !== "fechado" ? `<form class="grade mt" data-resposta><textarea name="texto" required placeholder="Escreva sua mensagem"></textarea><div class="acoes" style="justify-content:flex-end"><button class="botao" type="submit">Enviar</button></div></form>` : `<div class="alerta mt">Este chamado foi encerrado. Abra um novo se precisar.</div>`}
    </div>`;
  const form = alvo.querySelector("[data-resposta]");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    executar(form.querySelector("button"), async () => {
      await api(`/chamados/${id}/mensagens`, { metodo: "POST", corpo: { texto: form.texto.value } });
      verChamado(alvo, { id });
    });
  });
}

export const rotas = [
  { caminho: "/reservar", area: "site", perfis: PERFIL, titulo: "Finalizar reserva", render: reservar },
  { caminho: "/minhas-viagens", area: "site", perfis: PERFIL, titulo: "Minhas viagens", render: minhasViagens },
  { caminho: "/reserva/:id", area: "site", perfis: PERFIL, titulo: "Reserva", render: detalheReserva },
  { caminho: "/checkin/:id", area: "site", perfis: PERFIL, titulo: "Check-in", render: checkin },
  { caminho: "/bilhete/:id", area: "site", perfis: PERFIL, titulo: "Bilhete", render: bilhete },
  { caminho: "/perfil", area: "site", perfis: PERFIL, titulo: "Perfil", render: perfil },
  { caminho: "/notificacoes", area: "site", perfis: PERFIL, titulo: "Notificações", render: notificacoes },
  { caminho: "/atendimento", area: "site", perfis: PERFIL, titulo: "Atendimento", render: atendimento },
  { caminho: "/atendimento/:id", area: "site", perfis: PERFIL, titulo: "Chamado", render: verChamado },
];
