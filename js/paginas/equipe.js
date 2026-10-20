import { api, sessao } from "../api.js";
import {
  ROTULOS_FORMA,
  abrirModal,
  avisar,
  compacto,
  confirmar,
  cpfFormatado,
  dataBR,
  dataHoraBR,
  esc,
  estrelas,
  executar,
  grafico,
  hojeISO,
  moeda,
  selo,
  vazio,
} from "../ui.js";
import { cidades } from "./publico.js";
import { conversa } from "./cliente.js";

const EQUIPE = ["funcionario", "gerente"];
const ehGerente = () => sessao.perfil === "gerente";

function kpi(rotulo, valor, detalhe = "") {
  return `<div class="cartao kpi"><div class="rotulo">${esc(rotulo)}</div><div class="valor">${valor}</div>${detalhe ? `<div class="suave pequeno">${detalhe}</div>` : ""}</div>`;
}

async function visaoGeral(alvo) {
  const r = await api("/equipe/resumo");
  const nome = sessao.usuario.nome.split(" ")[0];
  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Olá, ${esc(nome)}</h1><p>Resumo da operação de hoje.</p></div>
    <div class="grade grade-4">
      ${kpi("Pagamentos pendentes", r.pendentes, `<a href="#/painel/reservas?status=pendente">Conferir boletos →</a>`)}
      ${kpi("Vendas hoje", r.vendas_hoje)}
      ${kpi("Receita no mês", moeda(r.receita_mes), `${r.vendas_mes} vendas confirmadas`)}
      ${kpi("Chamados abertos", r.chamados_abertos, `<a href="#/painel/atendimento">Responder →</a>`)}
    </div>
    <div class="grade grade-2 mt" style="align-items:start">
      <div class="cartao"><h2>Vendas dos últimos 7 dias</h2>${grafico(r.vendas_7_dias, (i) => i.dia, (i) => i.valor, (v) => (v ? "R$ " + compacto(v) : "0"))}</div>
      <div class="cartao">
        <h2>Próximos embarques</h2>
        ${r.proximos_embarques.length ? `<ul class="lista-simples">${r.proximos_embarques.map((e) => `
          <li class="entre"><span><strong>${esc(e.origem)} → ${esc(e.destino)}</strong><br><span class="suave pequeno">${esc(e.cliente_nome)} · ${e.qtd_passageiros} pax · ${esc(e.codigo)}</span></span><span class="pequeno">${dataHoraBR(e.partida)}${e.checkin_feito ? "<br><span class='selo confirmada'>check-in</span>" : ""}</span></li>`).join("")}</ul>` : vazio("Sem embarques programados.")}
      </div>
    </div>
    <div class="grade grade-2 mt">
      ${kpi("Clientes cadastrados", r.clientes)}
      ${kpi("Clientes bloqueados", r.bloqueados, ehGerente() ? `<a href="#/painel/clientes">Gerenciar →</a>` : "")}
    </div>`;
}

function detalheReservaHtml(r) {
  return `
    <div class="entre"><h2>Reserva ${esc(r.codigo)}</h2>${selo(r.status)}</div>
    <p class="suave pequeno">Localizador ${esc(r.localizador)} · criada em ${dataHoraBR(r.criado_em)}${r.confirmado_por ? ` · confirmada por ${esc(r.confirmado_por)}` : ""}</p>
    <div class="grade grade-2 mt">
      <div><span class="rotulo">Cliente</span><div><strong>${esc(r.cliente_nome)}</strong><br>${cpfFormatado(r.cliente_cpf)} · ${esc(r.cliente_email)}</div></div>
      <div><span class="rotulo">Voo</span><div><strong>${esc(r.origem)} → ${esc(r.destino)}</strong><br>${esc(r.companhia)} ${esc(r.voo_codigo)} · ${dataHoraBR(r.partida)}</div></div>
      <div><span class="rotulo">Hotel</span><div>${r.hotel ? `${esc(r.hotel)}<br>${dataBR(r.checkin)} a ${dataBR(r.checkout)} · ${r.quartos} quarto(s)` : "Somente aéreo"}</div></div>
      <div><span class="rotulo">Pagamento</span><div>${ROTULOS_FORMA[r.forma_pagamento]} · <strong>${moeda(r.total)}</strong>${r.pago_em ? `<br>pago em ${dataHoraBR(r.pago_em)}` : ""}${r.status === "cancelada" ? `<br>multa ${moeda(r.multa)} · reembolso ${moeda(r.reembolso)}` : ""}</div></div>
    </div>
    <div class="tabela-envolta mt"><table><tr><th>Passageiro</th><th>CPF</th><th>Assento</th><th>Bilhete</th></tr>
      ${r.passageiros.map((p) => `<tr><td>${esc(p.nome)}</td><td>${cpfFormatado(p.cpf)}</td><td>${esc(p.assento || "—")}</td><td>${esc(p.bilhete || "—")}</td></tr>`).join("")}
    </table></div>`;
}

export async function abrirReserva(id, aoMudar) {
  const r = await api("/equipe/reservas/" + id);
  const { elemento, fechar } = abrirModal(`
    ${detalheReservaHtml(r)}
    <div class="acoes mt" style="justify-content:flex-end">
      <button class="botao secundario" data-fechar>Fechar</button>
      ${r.status === "pendente" ? `<button class="botao" data-confirmar>Confirmar pagamento e emitir bilhete</button>` : ""}
    </div>`, { largo: true });
  elemento.querySelector("[data-confirmar]")?.addEventListener("click", (e) =>
    executar(e.currentTarget, async () => {
      await api(`/equipe/reservas/${id}/confirmar-pagamento`, { metodo: "POST" });
      avisar(`Pagamento da reserva ${r.codigo} confirmado. Bilhete emitido.`, "sucesso");
      fechar();
      aoMudar?.();
    })
  );
}

async function reservas(alvo, _, query) {
  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Reservas</h1><p>Consulte reservas e confirme pagamentos por boleto.</p></div>
    <form class="cartao grade grade-4 mb" data-filtros style="align-items:end">
      <div class="campo"><label>Status</label><select name="status"><option value="">Todos</option><option value="pendente">Pendente</option><option value="confirmada">Confirmada</option><option value="cancelada">Cancelada</option></select></div>
      <div class="campo"><label>Pagamento</label><select name="forma"><option value="">Todos</option><option value="cartao">Cartão</option><option value="pix">Pix</option><option value="boleto">Boleto</option></select></div>
      <div class="campo"><label>Busca</label><input name="busca" placeholder="Cliente, CPF, código, destino"></div>
      <button class="botao" type="submit">Filtrar</button>
    </form>
    <div data-tabela></div>`;
  const form = alvo.querySelector("[data-filtros]");
  form.status.value = query.status || "";
  const carregar = async () => {
    const parametros = new URLSearchParams(Object.entries(Object.fromEntries(new FormData(form))).filter(([, v]) => v));
    const lista = await api("/equipe/reservas?" + parametros);
    alvo.querySelector("[data-tabela]").innerHTML = lista.length ? `
      <div class="tabela-envolta"><table>
        <tr><th>Código</th><th>Cliente</th><th>Rota</th><th>Partida</th><th>Pagamento</th><th class="direita">Total</th><th>Status</th></tr>
        ${lista.map((r) => `<tr class="clicavel" data-id="${r.id}"><td><strong>${esc(r.codigo)}</strong></td><td>${esc(r.cliente_nome)}</td><td>${esc(r.origem)} → ${esc(r.destino)}${r.hotel ? `<br><span class="suave pequeno">${esc(r.hotel)}</span>` : ""}</td><td>${dataHoraBR(r.partida)}</td><td>${ROTULOS_FORMA[r.forma_pagamento]}</td><td class="direita">${moeda(r.total)}</td><td>${selo(r.status)}</td></tr>`).join("")}
      </table></div>
      <p class="suave pequeno mt">${lista.length} reserva(s). Clique para ver detalhes.</p>` : `<div class="cartao">${vazio("Nenhuma reserva encontrada.")}</div>`;
    alvo.querySelectorAll("[data-id]").forEach((linha) => linha.addEventListener("click", () => abrirReserva(linha.dataset.id, carregar).catch((e) => avisar(e.message, "erro"))));
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    executar(form.querySelector("button"), carregar);
  });
  await carregar();
}

async function clientes(alvo) {
  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Clientes</h1><p>${ehGerente() ? "Histórico, bloqueio e desbloqueio de clientes." : "Consulte o histórico dos clientes."}</p></div>
    <form class="cartao acoes mb" data-busca style="flex-wrap:nowrap"><input name="busca" placeholder="Nome, e-mail ou CPF"><button class="botao" type="submit">Buscar</button></form>
    <div data-tabela></div>`;
  const form = alvo.querySelector("[data-busca]");
  const carregar = async () => {
    const lista = await api("/equipe/clientes?busca=" + encodeURIComponent(form.busca.value));
    alvo.querySelector("[data-tabela]").innerHTML = lista.length ? `
      <div class="tabela-envolta"><table>
        <tr><th>Cliente</th><th>CPF</th><th>Nível</th><th>Reservas</th><th class="direita">Total gasto</th><th>Cancel. 30d</th><th>Situação</th></tr>
        ${lista.map((c) => `<tr class="clicavel" data-id="${c.id}"><td><strong>${esc(c.nome)}</strong><br><span class="suave pequeno">${esc(c.email)}</span></td><td>${cpfFormatado(c.cpf)}</td><td>${esc(c.nivel)}<br><span class="suave pequeno">${c.pontos.toLocaleString("pt-BR")} pts</span></td><td>${c.total_reservas}</td><td class="direita">${moeda(c.total_gasto)}</td><td>${c.cancelamentos_30_dias}</td><td>${c.bloqueado ? '<span class="selo bloqueado">Bloqueado</span>' : '<span class="selo ativo">Ativo</span>'}</td></tr>`).join("")}
      </table></div>` : `<div class="cartao">${vazio("Nenhum cliente encontrado.")}</div>`;
    alvo.querySelectorAll("[data-id]").forEach((linha) => linha.addEventListener("click", () => abrirCliente(linha.dataset.id, carregar).catch((e) => avisar(e.message, "erro"))));
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    executar(form.querySelector("button"), carregar);
  });
  await carregar();
}

async function abrirCliente(id, aoMudar) {
  const c = await api("/equipe/clientes/" + id);
  const { elemento, fechar } = abrirModal(`
    <div class="entre"><h2>${esc(c.nome)}</h2>${c.bloqueado ? '<span class="selo bloqueado">Bloqueado</span>' : '<span class="selo ativo">Ativo</span>'}</div>
    <p class="suave pequeno">${cpfFormatado(c.cpf)} · ${esc(c.email)}${c.telefone ? " · " + esc(c.telefone) : ""} · cliente desde ${dataBR(c.criado_em)} · ${esc(c.nivel)} (${c.pontos.toLocaleString("pt-BR")} pts)</p>
    <h3 class="mt">Reservas</h3>
    ${c.reservas.length ? `<div class="tabela-envolta"><table><tr><th>Código</th><th>Rota</th><th>Partida</th><th class="direita">Total</th><th>Status</th></tr>
      ${c.reservas.map((r) => `<tr><td>${esc(r.codigo)}</td><td>${esc(r.origem)} → ${esc(r.destino)}</td><td>${dataHoraBR(r.partida)}</td><td class="direita">${moeda(r.total)}</td><td>${selo(r.status)}</td></tr>`).join("")}</table></div>` : vazio("Sem reservas.")}
    <h3 class="mt">Chamados</h3>
    ${c.chamados.length ? `<ul class="lista-simples">${c.chamados.map((ch) => `<li class="entre"><span>${esc(ch.assunto)}</span>${selo(ch.status)}</li>`).join("")}</ul>` : `<p class="suave pequeno">Nenhum chamado.</p>`}
    <div class="acoes mt" style="justify-content:flex-end">
      <button class="botao secundario" data-fechar>Fechar</button>
      ${ehGerente() ? `<button class="botao ${c.bloqueado ? "" : "perigo"}" data-bloqueio>${c.bloqueado ? "Desbloquear cliente" : "Bloquear cliente"}</button>` : ""}
    </div>`, { largo: true });
  elemento.querySelector("[data-bloqueio]")?.addEventListener("click", (e) =>
    executar(e.currentTarget, async () => {
      await api(`/gerente/clientes/${id}/bloqueio`, { metodo: "POST", corpo: { bloquear: !c.bloqueado } });
      avisar(c.bloqueado ? "Cliente desbloqueado." : "Cliente bloqueado.", "sucesso");
      fechar();
      aoMudar?.();
    })
  );
}

async function atendimentoEquipe(alvo) {
  let status = "aberto";
  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Atendimento</h1><p>Chamados abertos pelos clientes.</p></div>
    <div class="abas">
      <button data-s="aberto">Aguardando resposta</button><button data-s="respondido">Respondidos</button><button data-s="fechado">Encerrados</button><button data-s="">Todos</button>
    </div>
    <div data-lista></div>`;
  const carregar = async () => {
    alvo.querySelectorAll("[data-s]").forEach((b) => b.classList.toggle("ativo", b.dataset.s === status));
    const lista = await api("/equipe/chamados" + (status ? "?status=" + status : ""));
    alvo.querySelector("[data-lista]").innerHTML = lista.length ? `
      <div class="tabela-envolta"><table><tr><th>#</th><th>Assunto</th><th>Cliente</th><th>Reserva</th><th>Atualizado</th><th>Status</th></tr>
        ${lista.map((c) => `<tr class="clicavel" data-id="${c.id}"><td>${c.id}</td><td><strong>${esc(c.assunto)}</strong></td><td>${esc(c.cliente_nome)}</td><td>${esc(c.reserva_codigo || "—")}</td><td>${dataHoraBR(c.atualizado_em)}</td><td>${selo(c.status)}</td></tr>`).join("")}
      </table></div>` : `<div class="cartao">${vazio("Nenhum chamado aqui.")}</div>`;
    alvo.querySelectorAll("[data-id]").forEach((linha) => linha.addEventListener("click", () => abrirChamado(linha.dataset.id, carregar).catch((e) => avisar(e.message, "erro"))));
  };
  alvo.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => ((status = b.dataset.s), carregar())));
  await carregar();
}

async function abrirChamado(id, aoMudar) {
  const c = await api("/chamados/" + id);
  const { elemento, fechar } = abrirModal(`
    <div class="entre"><h2>${esc(c.assunto)}</h2>${selo(c.status)}</div>
    <p class="suave pequeno">#${c.id} · ${esc(c.cliente_nome)}${c.reserva_codigo ? ` · reserva ${esc(c.reserva_codigo)}` : ""}</p>
    ${conversa(c)}
    ${c.status !== "fechado" ? `<form class="grade mt" data-resposta><textarea name="texto" required placeholder="Resposta ao cliente"></textarea></form>` : ""}
    <div class="acoes mt" style="justify-content:flex-end">
      ${c.reserva_id ? `<button class="botao fantasma" data-reserva>Ver reserva</button>` : ""}
      <button class="botao secundario" data-status="${c.status === "fechado" ? "aberto" : "fechado"}">${c.status === "fechado" ? "Reabrir" : "Encerrar chamado"}</button>
      ${c.status !== "fechado" ? `<button class="botao" data-enviar>Responder</button>` : ""}
    </div>`, { largo: true });
  elemento.querySelector("[data-enviar]")?.addEventListener("click", (e) => {
    const texto = elemento.querySelector("[name=texto]").value.trim();
    if (!texto) return avisar("Escreva a resposta.", "erro");
    executar(e.currentTarget, async () => {
      await api(`/chamados/${id}/mensagens`, { metodo: "POST", corpo: { texto } });
      avisar("Resposta enviada ao cliente.", "sucesso");
      fechar();
      aoMudar?.();
    });
  });
  elemento.querySelector("[data-status]").addEventListener("click", (e) =>
    executar(e.currentTarget, async () => {
      await api(`/equipe/chamados/${id}/status`, { metodo: "POST", corpo: { status: e.currentTarget.dataset.status } });
      fechar();
      aoMudar?.();
    })
  );
  elemento.querySelector("[data-reserva]")?.addEventListener("click", () => abrirReserva(c.reserva_id));
}

function tabela(cabecalho, linhas) {
  return linhas.length
    ? `<div class="tabela-envolta"><table><tr>${cabecalho.map((c) => `<th${c.startsWith(">") ? ' class="direita"' : ""}>${esc(c.replace(">", ""))}</th>`).join("")}</tr>${linhas.join("")}</table></div>`
    : vazio("Sem dados no período.");
}

async function relatorios(alvo, _, query) {
  const inicio = query.inicio || hojeISO(-365);
  const fim = query.fim || hojeISO();
  const parametros = new URLSearchParams({ inicio, fim });
  const r = await api("/equipe/relatorios?" + parametros);
  const s = r.resumo;
  const nomeMes = (m) => new Date(m + "-15T12:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  alvo.innerHTML = `
    <div class="titulo-pagina entre">
      <div><h1>Relatórios</h1><p>${dataBR(r.periodo.inicio)} a ${dataBR(r.periodo.fim)}</p></div>
      <form class="acoes" data-periodo>
        <input type="date" name="inicio" value="${inicio}" style="width:auto"><input type="date" name="fim" value="${fim}" style="width:auto">
        <button class="botao secundario" type="submit">Aplicar</button>
        <button class="botao" type="button" data-csv>Exportar CSV</button>
      </form>
    </div>
    <div class="grade grade-4">
      ${kpi("Receita", moeda(s.receita), `comissão ${moeda(s.comissao)}`)}
      ${kpi("Vendas confirmadas", s.confirmadas, `ticket médio ${moeda(s.ticket_medio)}`)}
      ${kpi("Taxa de cancelamento", s.taxa_cancelamento + "%", `${s.canceladas} cancelamentos · multas ${moeda(s.multas)}`)}
      ${kpi("Pendentes de pagamento", s.pendentes, moeda(s.valor_pendente))}
    </div>
    <div class="cartao mt"><h2>Faturamento mensal</h2>${grafico(r.mensal, (m) => nomeMes(m.mes), (m) => m.receita, (v) => "R$ " + compacto(v))}</div>
    <div class="grade grade-2 mt" style="align-items:start">
      <div class="cartao"><h2>Destinos mais vendidos</h2>${tabela(["Destino", ">Vendas", ">Receita"], r.destinos.map((d) => `<tr><td>${esc(d.destino)}</td><td class="direita">${d.vendas}</td><td class="direita">${moeda(d.receita)}</td></tr>`))}</div>
      <div class="cartao"><h2>Pacotes mais vendidos</h2>${tabela(["Destino", "Pacote", ">Qtd."], r.pacotes.map((p) => `<tr><td>${esc(p.destino)}</td><td>${esc(p.pacote)}</td><td class="direita">${p.quantidade}</td></tr>`))}</div>
      <div class="cartao"><h2>Formas de pagamento</h2>${tabela(["Forma", ">Qtd.", ">Valor"], r.formas_pagamento.map((f) => `<tr><td>${ROTULOS_FORMA[f.forma] || esc(f.forma)}</td><td class="direita">${f.quantidade}</td><td class="direita">${moeda(f.valor)}</td></tr>`))}</div>
      <div class="cartao"><h2>Melhores clientes</h2>${tabela(["Cliente", ">Compras", ">Valor"], r.melhores_clientes.map((c) => `<tr><td>${esc(c.cliente)}</td><td class="direita">${c.compras}</td><td class="direita">${moeda(c.valor)}</td></tr>`))}</div>
    </div>
    <div class="cartao mt"><h2>Ocupação dos próximos voos do catálogo</h2>${tabela(["Voo", "Rota", "Partida", ">Vendidos", "Ocupação"], r.ocupacao_voos.map((v) => `<tr><td>${esc(v.codigo)}</td><td>${esc(v.rota)}</td><td>${dataHoraBR(v.partida)}</td><td class="direita">${v.vendidos}/${v.total}</td><td style="min-width:140px"><div class="progresso"><div style="width:${v.percentual}%"></div></div><span class="suave pequeno">${v.percentual}%</span></td></tr>`))}</div>
    <div class="cartao mt"><h2>Detalhe por mês</h2>${tabela(["Mês", ">Vendas", ">Cancelamentos", ">Receita", ">Comissão"], [...r.mensal].reverse().map((m) => `<tr><td>${nomeMes(m.mes)}</td><td class="direita">${m.vendas}</td><td class="direita">${m.cancelamentos}</td><td class="direita">${moeda(m.receita)}</td><td class="direita">${moeda(m.comissao)}</td></tr>`))}</div>`;
  alvo.querySelector("[data-periodo]").addEventListener("submit", (e) => {
    e.preventDefault();
    location.hash = "#/painel/relatorios?" + new URLSearchParams(new FormData(e.target));
  });
  alvo.querySelector("[data-csv]").addEventListener("click", (e) =>
    executar(e.currentTarget, async () => {
      const resposta = await api("/equipe/relatorios/csv?" + parametros, { bruto: true });
      const arquivo = await resposta.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(arquivo);
      link.download = `relatorio-mundo-viagens-${inicio}-a-${fim}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    })
  );
}

async function hoteis(alvo) {
  const lista = await api("/equipe/hoteis");
  const listaCidades = await cidades();
  alvo.innerHTML = `
    <div class="titulo-pagina entre"><div><h1>Hotéis parceiros</h1><p>${ehGerente() ? "Cadastre e gerencie a rede de hotéis." : "Consulte a rede de hotéis parceiros."}</p></div>${ehGerente() ? `<button class="botao" data-novo>Novo hotel</button>` : ""}</div>
    <div class="tabela-envolta"><table>
      <tr><th>Hotel</th><th>Cidade</th><th>Categoria</th><th>Quartos</th><th class="direita">Diária</th><th>Status</th>${ehGerente() ? "<th></th>" : ""}</tr>
      ${lista.map((h) => `<tr><td><strong>${esc(h.nome)}</strong><br><span class="suave pequeno">${esc(h.endereco || "")}</span></td><td>${esc(h.cidade)}</td><td>${estrelas(h.estrelas)}</td><td>${h.quartos}</td><td class="direita">${moeda(h.diaria)}</td><td>${h.ativo ? '<span class="selo ativo">Ativo</span>' : '<span class="selo inativo">Inativo</span>'}</td>${ehGerente() ? `<td class="acoes"><button class="botao pequeno secundario" data-editar="${h.id}">Editar</button><button class="botao pequeno fantasma" data-alternar="${h.id}">${h.ativo ? "Desativar" : "Ativar"}</button></td>` : ""}</tr>`).join("")}
    </table></div>`;
  if (!ehGerente()) return;
  const formulario = (h = {}) => {
    const { elemento, fechar } = abrirModal(`
      <h2>${h.id ? "Editar hotel" : "Novo hotel"}</h2>
      <form class="grade mt" data-hotel>
        <div class="campo"><label>Nome</label><input name="nome" value="${esc(h.nome || "")}" required></div>
        <div class="grade grade-2">
          <div class="campo"><label>Cidade</label><select name="cidade">${listaCidades.map((c) => `<option ${c === h.cidade ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
          <div class="campo"><label>Categoria</label><select name="estrelas">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${n === (h.estrelas || 3) ? "selected" : ""}>${n} estrela(s)</option>`).join("")}</select></div>
        </div>
        <div class="campo"><label>Endereço</label><input name="endereco" value="${esc(h.endereco || "")}"></div>
        <div class="grade grade-2">
          <div class="campo"><label>Quartos</label><input type="number" name="quartos" min="1" value="${h.quartos || ""}" required></div>
          <div class="campo"><label>Diária (R$)</label><input type="number" step="0.01" min="1" name="diaria" value="${h.diaria || ""}" required></div>
        </div>
        <div class="acoes" style="justify-content:flex-end"><button type="button" class="botao secundario" data-fechar>Cancelar</button><button class="botao" type="submit">Salvar</button></div>
      </form>`);
    const form = elemento.querySelector("[data-hotel]");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      executar(form.querySelector("[type=submit]"), async () => {
        const dados = Object.fromEntries(new FormData(form));
        await api(h.id ? "/gerente/hoteis/" + h.id : "/gerente/hoteis", { metodo: h.id ? "PUT" : "POST", corpo: dados });
        fechar();
        avisar("Hotel salvo.", "sucesso");
        hoteis(alvo);
      });
    });
  };
  alvo.querySelector("[data-novo]").addEventListener("click", () => formulario());
  alvo.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => formulario(lista.find((h) => String(h.id) === b.dataset.editar))));
  alvo.querySelectorAll("[data-alternar]").forEach((b) =>
    b.addEventListener("click", async () => {
      const hotel = lista.find((h) => String(h.id) === b.dataset.alternar);
      if (hotel.ativo && !(await confirmar("Desativar hotel?", `${esc(hotel.nome)} deixará de aparecer para os clientes.`, "Desativar", true))) return;
      executar(b, async () => {
        await api("/gerente/hoteis/" + hotel.id, { metodo: "PUT", corpo: { ativo: !hotel.ativo } });
        hoteis(alvo);
      });
    })
  );
}

export const rotas = [
  { caminho: "/painel", area: "painel", perfis: EQUIPE, titulo: "Painel", render: visaoGeral },
  { caminho: "/painel/reservas", area: "painel", perfis: EQUIPE, titulo: "Reservas", render: reservas },
  { caminho: "/painel/clientes", area: "painel", perfis: EQUIPE, titulo: "Clientes", render: clientes },
  { caminho: "/painel/atendimento", area: "painel", perfis: EQUIPE, titulo: "Atendimento", render: atendimentoEquipe },
  { caminho: "/painel/relatorios", area: "painel", perfis: EQUIPE, titulo: "Relatórios", render: relatorios },
  { caminho: "/painel/hoteis", area: "painel", perfis: EQUIPE, titulo: "Hotéis", render: hoteis },
];
