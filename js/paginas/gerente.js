import { api, sessao } from "../api.js";
import { abrirModal, avisar, confirmar, dataBR, dataHoraBR, duracao, esc, executar, hojeISO, moeda, vazio } from "../ui.js";
import { cidades } from "./publico.js";

const GERENTE = ["gerente"];

async function voos(alvo, _, query) {
  const [lista, listaCidades] = await Promise.all([api("/gerente/voos" + (query.todos ? "?todos=1" : "")), cidades()]);
  alvo.innerHTML = `
    <div class="titulo-pagina entre">
      <div><h1>Voos e viagens</h1><p>Voos do catálogo próprio da agência, vendidos junto com a integração SkyHigh.</p></div>
      <div class="acoes"><a class="botao secundario" href="#/painel/voos${query.todos ? "" : "?todos=1"}">${query.todos ? "Somente próximos" : "Incluir passados"}</a><button class="botao" data-novo>Nova viagem</button></div>
    </div>
    <div class="cartao mb grade grade-4" style="align-items:end">
      <div class="campo"><label>Filtrar rota</label><input data-filtro placeholder="Cidade ou código"></div>
      <div class="suave pequeno">${lista.length} voo(s) · ${lista.filter((v) => v.ativo).length} ativos</div>
    </div>
    <div data-tabela></div>`;
  const desenhar = () => {
    const termo = alvo.querySelector("[data-filtro]").value.toLowerCase();
    const filtrados = lista.filter((v) => !termo || `${v.codigo} ${v.origem} ${v.destino}`.toLowerCase().includes(termo));
    alvo.querySelector("[data-tabela]").innerHTML = filtrados.length ? `
      <div class="tabela-envolta"><table>
        <tr><th>Voo</th><th>Rota</th><th>Partida</th><th>Duração</th><th class="direita">Preço</th><th>Ocupação</th><th>Status</th><th></th></tr>
        ${filtrados.slice(0, 200).map((v) => `<tr>
          <td><strong>${esc(v.codigo)}</strong><br><span class="suave pequeno">${esc(v.companhia)}</span></td>
          <td>${esc(v.origem)} → ${esc(v.destino)}</td>
          <td>${dataHoraBR(v.partida)}</td>
          <td>${duracao(v.partida, v.chegada)}</td>
          <td class="direita">${moeda(v.preco)}</td>
          <td style="min-width:120px"><div class="progresso"><div style="width:${(v.vendidos / v.assentos_total) * 100}%"></div></div><span class="suave pequeno">${v.vendidos}/${v.assentos_total}</span></td>
          <td>${v.ativo ? '<span class="selo ativo">À venda</span>' : '<span class="selo inativo">Suspenso</span>'}</td>
          <td class="acoes"><button class="botao pequeno secundario" data-editar="${v.id}">Editar</button><button class="botao pequeno fantasma" data-remover="${v.id}">Remover</button></td>
        </tr>`).join("")}
      </table></div>
      ${filtrados.length > 200 ? `<p class="suave pequeno mt">Mostrando 200 de ${filtrados.length}. Use o filtro para refinar.</p>` : ""}` : `<div class="cartao">${vazio("Nenhum voo encontrado.")}</div>`;
    alvo.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => formulario(lista.find((v) => String(v.id) === b.dataset.editar))));
    alvo.querySelectorAll("[data-remover]").forEach((b) =>
      b.addEventListener("click", async () => {
        const voo = lista.find((v) => String(v.id) === b.dataset.remover);
        if (!(await confirmar("Remover voo?", `${esc(voo.codigo)} de ${dataHoraBR(voo.partida)}. Se já houver passagens vendidas, o voo será apenas suspenso.`, "Remover", true))) return;
        executar(b, async () => {
          const resposta = await api("/gerente/voos/" + voo.id, { metodo: "DELETE" });
          avisar(resposta.mensagem, "sucesso");
          voos(alvo, _, query);
        });
      })
    );
  };
  const formulario = (v = {}) => {
    const minutos = v.id ? Math.round((new Date(v.chegada.replace(" ", "T")) - new Date(v.partida.replace(" ", "T"))) / 60000) : 90;
    const { elemento, fechar } = abrirModal(`
      <h2>${v.id ? "Editar voo " + esc(v.codigo) : "Nova viagem"}</h2>
      <form class="grade mt" data-voo>
        <div class="grade grade-2">
          <div class="campo"><label>Código do voo</label><input name="codigo" value="${esc(v.codigo || "")}" placeholder="MV2040" required></div>
          <div class="campo"><label>Companhia</label><input name="companhia" value="${esc(v.companhia || "SkyHigh Airlines")}"></div>
          <div class="campo"><label>Origem</label><select name="origem">${listaCidades.map((c) => `<option ${c === (v.origem || "São Paulo") ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
          <div class="campo"><label>Destino</label><select name="destino">${listaCidades.map((c) => `<option ${c === (v.destino || "Rio de Janeiro") ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
          <div class="campo"><label>Partida</label><input type="datetime-local" name="partida" value="${v.partida ? v.partida.replace(" ", "T") : hojeISO(7) + "T08:00"}" required></div>
          <div class="campo"><label>Duração (minutos)</label><input type="number" name="duracao_minutos" min="20" value="${minutos}" required></div>
          <div class="campo"><label>Preço por passageiro (R$)</label><input type="number" step="0.01" min="1" name="preco" value="${v.preco || ""}" required></div>
          <div class="campo"><label>Assentos</label><input type="number" min="6" name="assentos_total" value="${v.assentos_total || 150}" required></div>
          ${v.id ? `<label class="opcao-cartao"><input type="checkbox" name="ativo" ${v.ativo ? "checked" : ""}><span>À venda</span></label>` : `<div class="campo"><label>Repetir diariamente por (dias)</label><input type="number" name="repetir_dias" min="1" max="60" value="1"></div>`}
        </div>
        <div class="acoes" style="justify-content:flex-end"><button type="button" class="botao secundario" data-fechar>Cancelar</button><button class="botao" type="submit">Salvar</button></div>
      </form>`, { largo: true });
    const form = elemento.querySelector("[data-voo]");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(form));
      if (v.id) dados.ativo = form.ativo.checked;
      executar(form.querySelector("[type=submit]"), async () => {
        const resposta = await api(v.id ? "/gerente/voos/" + v.id : "/gerente/voos", { metodo: v.id ? "PUT" : "POST", corpo: dados });
        fechar();
        avisar(v.id ? "Voo atualizado." : `${resposta.length} voo(s) criado(s) e já disponíveis na busca.`, "sucesso");
        voos(alvo, _, query);
      });
    });
  };
  alvo.querySelector("[data-novo]").addEventListener("click", () => formulario());
  alvo.querySelector("[data-filtro]").addEventListener("input", desenhar);
  desenhar();
}

async function promocoes(alvo) {
  const [dados, listaCidades] = await Promise.all([api("/gerente/promocoes"), cidades()]);
  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Promoções e cupons</h1><p>Promoções valem automaticamente para um destino. Cupons são códigos digitados pelo cliente.</p></div>
    <div class="grade grade-2" style="align-items:start">
      <div>
        <form class="cartao grade" data-promocao>
          <h2>Nova promoção por destino</h2>
          <div class="grade grade-2">
            <div class="campo"><label>Destino</label><select name="destino">${listaCidades.map((c) => `<option>${esc(c)}</option>`).join("")}</select></div>
            <div class="campo"><label>Desconto (%)</label><input type="number" name="desconto" min="1" max="90" step="0.5" required></div>
          </div>
          <div class="campo"><label>Descrição</label><input name="descricao" placeholder="Ex.: Férias no Nordeste" required></div>
          <div class="campo"><label>Válida até (opcional)</label><input type="date" name="validade" min="${hojeISO()}"></div>
          <button class="botao" type="submit">Criar promoção</button>
        </form>
        <div class="cartao">
          <h2>Promoções</h2>
          ${dados.promocoes.length ? `<ul class="lista-simples">${dados.promocoes.map((p) => `
            <li class="entre"><span><strong>${esc(p.descricao)}</strong><br><span class="suave pequeno">${esc(p.destino)} · ${p.desconto}%${p.validade ? " · até " + dataBR(p.validade) : ""}</span></span>
            <span class="acoes">${p.ativa ? '<span class="selo ativo">Ativa</span>' : '<span class="selo inativo">Inativa</span>'}<button class="botao pequeno secundario" data-promo-alternar="${p.id}" data-ativo="${p.ativa}">${p.ativa ? "Pausar" : "Ativar"}</button><button class="botao pequeno fantasma" data-promo-remover="${p.id}">Excluir</button></span></li>`).join("")}</ul>` : vazio("Nenhuma promoção.")}
        </div>
      </div>
      <div>
        <form class="cartao grade" data-cupom>
          <h2>Novo cupom</h2>
          <div class="grade grade-2">
            <div class="campo"><label>Código</label><input name="codigo" placeholder="NATAL20" required style="text-transform:uppercase"></div>
            <div class="campo"><label>Desconto (%)</label><input type="number" name="desconto" min="1" max="90" step="0.5" required></div>
            <div class="campo"><label>Limite de usos (opcional)</label><input type="number" name="usos_max" min="1"></div>
            <div class="campo"><label>Validade (opcional)</label><input type="date" name="validade" min="${hojeISO()}"></div>
          </div>
          <button class="botao" type="submit">Criar cupom</button>
        </form>
        <div class="cartao">
          <h2>Cupons</h2>
          ${dados.cupons.length ? `<ul class="lista-simples">${dados.cupons.map((c) => `
            <li class="entre"><span><strong>${esc(c.codigo)}</strong><br><span class="suave pequeno">${c.desconto}% · usado ${c.usos}${c.usos_max ? "/" + c.usos_max : ""} vez(es)${c.validade ? " · até " + dataBR(c.validade) : ""}</span></span>
            <span class="acoes">${c.ativo ? '<span class="selo ativo">Ativo</span>' : '<span class="selo inativo">Inativo</span>'}<button class="botao pequeno secundario" data-cupom-alternar="${c.id}" data-ativo="${c.ativo}">${c.ativo ? "Pausar" : "Ativar"}</button><button class="botao pequeno fantasma" data-cupom-remover="${c.id}">Excluir</button></span></li>`).join("")}</ul>` : vazio("Nenhum cupom.")}
        </div>
      </div>
    </div>`;
  const recarregar = () => promocoes(alvo);
  const enviar = (seletor, url) => {
    const form = alvo.querySelector(seletor);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      executar(form.querySelector("[type=submit]"), async () => {
        await api(url, { metodo: "POST", corpo: Object.fromEntries(new FormData(form)) });
        avisar("Criado com sucesso.", "sucesso");
        recarregar();
      });
    });
  };
  enviar("[data-promocao]", "/gerente/promocoes");
  enviar("[data-cupom]", "/gerente/cupons");
  const acao = (atributo, montar) =>
    alvo.querySelectorAll(`[${atributo}]`).forEach((b) =>
      b.addEventListener("click", async () => {
        const [url, opcoes, pergunta] = montar(b.getAttribute(atributo), b.dataset.ativo === "true");
        if (pergunta && !(await confirmar(pergunta, "Esta ação não pode ser desfeita.", "Excluir", true))) return;
        executar(b, async () => {
          await api(url, opcoes);
          recarregar();
        });
      })
    );
  acao("data-promo-alternar", (id, ativo) => ["/gerente/promocoes/" + id, { metodo: "PUT", corpo: { ativa: !ativo } }]);
  acao("data-promo-remover", (id) => ["/gerente/promocoes/" + id, { metodo: "DELETE" }, "Excluir promoção?"]);
  acao("data-cupom-alternar", (id, ativo) => ["/gerente/cupons/" + id, { metodo: "PUT", corpo: { ativo: !ativo } }]);
  acao("data-cupom-remover", (id) => ["/gerente/cupons/" + id, { metodo: "DELETE" }, "Excluir cupom?"]);
}

async function funcionarios(alvo) {
  const lista = await api("/gerente/funcionarios");
  const meuId = sessao.usuario.id;
  alvo.innerHTML = `
    <div class="titulo-pagina entre"><div><h1>Funcionários</h1><p>Adicione, edite ou remova pessoas da equipe.</p></div><button class="botao" data-novo>Adicionar funcionário</button></div>
    <div class="tabela-envolta"><table>
      <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Desde</th><th>Status</th><th></th></tr>
      ${lista.map((f) => `<tr>
        <td><strong>${esc(f.nome)}</strong>${f.id === meuId ? ' <span class="selo">você</span>' : ""}</td>
        <td>${esc(f.email)}</td>
        <td>${f.perfil === "gerente" ? "Gerente" : "Funcionário"}</td>
        <td>${dataBR(f.criado_em)}</td>
        <td>${f.ativo ? '<span class="selo ativo">Ativo</span>' : '<span class="selo inativo">Inativo</span>'}</td>
        <td class="acoes">${f.id === meuId ? "" : `<button class="botao pequeno secundario" data-editar="${f.id}">Editar</button><button class="botao pequeno fantasma" data-remover="${f.id}">Remover</button>`}</td>
      </tr>`).join("")}
    </table></div>
    <div class="alerta mt pequeno"><strong>Funcionário:</strong> consulta reservas, confirma pagamentos, atende chamados e emite relatórios. <strong>Gerente:</strong> tudo isso, mais voos, hotéis, promoções, bloqueio de clientes, equipe e configurações.</div>`;
  const formulario = (f = {}) => {
    const { elemento, fechar } = abrirModal(`
      <h2>${f.id ? "Editar " + esc(f.nome) : "Novo funcionário"}</h2>
      <form class="grade mt" data-funcionario>
        <div class="campo"><label>Nome completo</label><input name="nome" value="${esc(f.nome || "")}" required></div>
        ${f.id ? "" : `<div class="campo"><label>E-mail</label><input type="email" name="email" required></div>`}
        <div class="grade grade-2">
          <div class="campo"><label>Perfil</label><select name="perfil"><option value="funcionario" ${f.perfil === "funcionario" ? "selected" : ""}>Funcionário</option><option value="gerente" ${f.perfil === "gerente" ? "selected" : ""}>Gerente</option></select></div>
          <div class="campo"><label>${f.id ? "Nova senha (opcional)" : "Senha inicial"}</label><input type="password" name="senha" minlength="6" ${f.id ? "" : "required"}></div>
        </div>
        ${f.id ? `<label class="opcao-cartao"><input type="checkbox" name="ativo" ${f.ativo ? "checked" : ""}><span>Acesso ativo</span></label>` : ""}
        <div class="acoes" style="justify-content:flex-end"><button type="button" class="botao secundario" data-fechar>Cancelar</button><button class="botao" type="submit">Salvar</button></div>
      </form>`);
    const form = elemento.querySelector("[data-funcionario]");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(form));
      if (f.id) dados.ativo = form.ativo.checked;
      if (!dados.senha) delete dados.senha;
      executar(form.querySelector("[type=submit]"), async () => {
        await api(f.id ? "/gerente/funcionarios/" + f.id : "/gerente/funcionarios", { metodo: f.id ? "PUT" : "POST", corpo: dados });
        fechar();
        avisar("Funcionário salvo.", "sucesso");
        funcionarios(alvo);
      });
    });
  };
  alvo.querySelector("[data-novo]").addEventListener("click", () => formulario());
  alvo.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => formulario(lista.find((f) => String(f.id) === b.dataset.editar))));
  alvo.querySelectorAll("[data-remover]").forEach((b) =>
    b.addEventListener("click", async () => {
      const f = lista.find((x) => String(x.id) === b.dataset.remover);
      if (!(await confirmar("Remover funcionário?", `${esc(f.nome)} perderá o acesso ao painel. Para manter o histórico sem acesso, use "Editar" e desative.`, "Remover", true))) return;
      executar(b, async () => {
        await api("/gerente/funcionarios/" + f.id, { metodo: "DELETE" });
        avisar("Funcionário removido.", "sucesso");
        funcionarios(alvo);
      });
    })
  );
}

const CAMPOS_CONFIG = [
  ["Vendas", [
    ["comissao", "Comissão da agência (%)", "Somada ao valor de cada venda."],
  ]],
  ["Cancelamento", [
    ["prazo_cancelamento_horas", "Prazo para cancelar sem custo (horas)", "Antes da partida do voo."],
    ["multa_percentual", "Multa após o prazo (%)", "Sobre o valor pago."],
    ["limite_cancelamentos", "Cancelamentos para bloqueio automático", ""],
    ["janela_cancelamentos_dias", "Janela de contagem (dias)", ""],
  ]],
  ["Programa de pontos", [
    ["pontos_por_real", "Pontos por R$ 1 gasto", ""],
    ["valor_ponto", "Valor de cada ponto (R$)", "Usado como desconto."],
    ["limite_desconto_pontos", "Máximo pago com pontos (%)", ""],
  ]],
];

async function configuracoes(alvo) {
  const config = await api("/gerente/config");
  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Configurações</h1><p>Valores e regras aplicados a todas as novas reservas.</p></div>
    <form data-config style="max-width:820px">
      ${CAMPOS_CONFIG.map(([grupo, campos]) => `
        <div class="cartao"><h2>${grupo}</h2><div class="grade grade-2 mt">
          ${campos.map(([chave, rotulo, ajuda]) => `<div class="campo"><label>${rotulo}</label><input type="number" step="any" min="0" name="${chave}" value="${esc(config[chave])}" required>${ajuda ? `<span class="suave pequeno">${ajuda}</span>` : ""}</div>`).join("")}
        </div></div>`).join("")}
      <div class="cartao">
        <h2>Integração SkyHigh Airlines</h2>
        <div class="grade mt">
          <label class="opcao-cartao"><input type="checkbox" name="skyhigh_ativo" ${config.skyhigh_ativo === "1" ? "checked" : ""}><span><strong>Vender voos da SkyHigh</strong><br><span class="suave pequeno">Consulta em tempo real pela API da companhia.</span></span></label>
          <label class="opcao-cartao"><input type="checkbox" name="skyhigh_fora_do_ar" ${config.skyhigh_fora_do_ar === "1" ? "checked" : ""}><span><strong>Simular SkyHigh fora do ar</strong><br><span class="suave pequeno">Para testar a mensagem amigável e as novas tentativas automáticas.</span></span></label>
        </div>
      </div>
      <div class="acoes mt"><button class="botao grande" type="submit">Salvar configurações</button></div>
    </form>`;
  const form = alvo.querySelector("[data-config]");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(form));
    dados.skyhigh_ativo = form.skyhigh_ativo.checked ? 1 : 0;
    dados.skyhigh_fora_do_ar = form.skyhigh_fora_do_ar.checked ? 1 : 0;
    executar(form.querySelector("[type=submit]"), async () => {
      await api("/gerente/config", { metodo: "PUT", corpo: dados });
      avisar("Configurações salvas.", "sucesso");
    });
  });
}

async function auditoria(alvo, _, query) {
  const logs = await api("/gerente/logs" + (query.busca ? "?busca=" + encodeURIComponent(query.busca) : ""));
  alvo.innerHTML = `
    <div class="titulo-pagina"><h1>Auditoria</h1><p>Registro das operações importantes: reservas, pagamentos, cancelamentos, alterações e acessos.</p></div>
    <form class="cartao acoes mb" data-busca style="flex-wrap:nowrap"><input name="busca" value="${esc(query.busca || "")}" placeholder="Usuário, operação ou detalhe"><button class="botao" type="submit">Buscar</button></form>
    ${logs.length ? `<div class="tabela-envolta"><table><tr><th>Data e hora</th><th>Usuário</th><th>Operação</th><th>Detalhe</th></tr>
      ${logs.map((l) => `<tr><td style="white-space:nowrap">${dataHoraBR(l.data_hora)}</td><td>${esc(l.usuario)}</td><td><span class="selo">${esc(l.acao.replace(/_/g, " "))}</span></td><td>${esc(l.detalhe || "")}</td></tr>`).join("")}
    </table></div>` : `<div class="cartao">${vazio("Nenhum registro encontrado.")}</div>`}`;
  alvo.querySelector("[data-busca]").addEventListener("submit", (e) => {
    e.preventDefault();
    location.hash = "#/painel/auditoria?" + new URLSearchParams(new FormData(e.target));
  });
}

export const rotas = [
  { caminho: "/painel/voos", area: "painel", perfis: GERENTE, titulo: "Voos", render: voos },
  { caminho: "/painel/promocoes", area: "painel", perfis: GERENTE, titulo: "Promoções", render: promocoes },
  { caminho: "/painel/equipe", area: "painel", perfis: GERENTE, titulo: "Funcionários", render: funcionarios },
  { caminho: "/painel/configuracoes", area: "painel", perfis: GERENTE, titulo: "Configurações", render: configuracoes },
  { caminho: "/painel/auditoria", area: "painel", perfis: GERENTE, titulo: "Auditoria", render: auditoria },
];
