import { api, sessao } from "../api.js";
import { avisar, dataBR, diaSemana, duracao, esc, executar, hojeISO, hora, moeda, sigla, vazio } from "../ui.js";

let cacheCidades = null;

export async function cidades() {
  if (!cacheCidades) cacheCidades = await api("/cidades");
  return cacheCidades;
}

let cacheConfig = null;

export async function configPublica() {
  if (!cacheConfig) cacheConfig = (await api("/inicio")).config;
  return cacheConfig;
}

function opcoes(lista, selecionada) {
  return lista.map((c) => `<option ${c === selecionada ? "selected" : ""}>${esc(c)}</option>`).join("");
}

function formularioBusca(listaCidades, valores = {}) {
  return `
    <form class="busca" data-busca>
      <div class="campo"><label>Origem</label><select name="origem">${opcoes(listaCidades, valores.origem || "São Paulo")}</select></div>
      <div class="campo"><label>Destino</label><select name="destino">${opcoes(listaCidades, valores.destino || "Rio de Janeiro")}</select></div>
      <div class="campo"><label>Ida</label><input type="date" name="data" min="${hojeISO()}" value="${esc(valores.data || hojeISO(7))}" required></div>
      <div class="campo"><label>Passageiros</label><input type="number" name="passageiros" min="1" max="9" value="${esc(valores.passageiros || 1)}" required></div>
      <button class="botao grande" type="submit">Buscar voos</button>
    </form>`;
}

function ligarBusca(raiz) {
  raiz.querySelector("[data-busca]").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const dados = new FormData(evento.target);
    if (dados.get("origem") === dados.get("destino")) {
      avisar("Origem e destino precisam ser diferentes.", "erro");
      return;
    }
    location.hash = "#/voos?" + new URLSearchParams(dados).toString();
  });
}

async function inicio(alvo) {
  const [dados, lista] = await Promise.all([api("/inicio"), cidades()]);
  cacheConfig = dados.config;
  alvo.innerHTML = `
    <section class="heroi">
      <h1>Sua próxima viagem começa aqui.</h1>
      <p>Passagens em tempo real, hotéis parceiros, check-in online e pontos em cada compra. Tudo em um só lugar.</p>
      ${formularioBusca(lista)}
    </section>

    ${dados.promocoes.length ? `
    <section class="mb">
      <div class="entre mb"><h2>Promoções da semana</h2></div>
      <div class="grade grade-auto">
        ${dados.promocoes.map((p) => `
          <div class="cartao oferta" data-destino="${esc(p.destino)}">
            <span class="selo">${p.desconto}% OFF</span>
            <h3 class="mt">${esc(p.destino)}</h3>
            <p class="suave pequeno">${esc(p.descricao)}${p.validade ? ` · até ${dataBR(p.validade)}` : ""}</p>
          </div>`).join("")}
      </div>
    </section>` : ""}

    ${dados.ofertas.length ? `
    <section class="mt-g">
      <h2 class="mb">Ofertas saindo em breve</h2>
      <div class="grade grade-3">
        ${dados.ofertas.map((v) => `
          <div class="cartao oferta" data-oferta='${esc(JSON.stringify({ origem: v.origem, destino: v.destino, data: v.partida.slice(0, 10) }))}'>
            <div class="entre"><span class="suave pequeno">${esc(diaSemana(v.partida))} · ${hora(v.partida)}</span><span class="selo">${v.assentos} lugares</span></div>
            <h3 class="mt">${esc(v.origem)} → ${esc(v.destino)}</h3>
            <div class="suave pequeno">a partir de</div>
            <div class="preco">${moeda(v.preco)}</div>
          </div>`).join("")}
      </div>
    </section>` : ""}

    <section class="mt-g">
      <h2 class="mb">Por que viajar com a Mundo Viagens</h2>
      <div class="grade grade-4">
        <div class="cartao"><h3>Check-in online</h3><p class="suave pequeno">Escolha seu assento no mapa do avião e baixe o cartão de embarque com QR Code.</p></div>
        <div class="cartao"><h3>Programa de pontos</h3><p class="suave pequeno">Cada R$ 1 vira ${dados.config.pontos_por_real} ponto. Troque pontos por desconto nas próximas compras.</p></div>
        <div class="cartao"><h3>Pague como preferir</h3><p class="suave pequeno">Cartão e Pix com confirmação imediata, ou boleto em até 2 dias úteis.</p></div>
        <div class="cartao"><h3>Atendimento online</h3><p class="suave pequeno">Abra um chamado e acompanhe a resposta da nossa equipe pelo site.</p></div>
      </div>
    </section>`;
  ligarBusca(alvo);
  alvo.querySelectorAll("[data-destino]").forEach((cartao) =>
    cartao.addEventListener("click", () => {
      alvo.querySelector("[name=destino]").value = cartao.dataset.destino;
      alvo.querySelector("[name=data]").focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
  );
  alvo.querySelectorAll("[data-oferta]").forEach((cartao) =>
    cartao.addEventListener("click", () => {
      location.hash = "#/voos?" + new URLSearchParams({ ...JSON.parse(cartao.dataset.oferta), passageiros: 1 });
    })
  );
}

function cartaoVoo(voo, indice) {
  return `
    <div class="cartao voo">
      <div>
        <div class="voo-horas">
          <div><div class="hora">${hora(voo.partida)}</div><div class="suave pequeno">${sigla(voo.origem)}</div></div>
          <div class="voo-linha"><span>${duracao(voo.partida, voo.chegada)}</span></div>
          <div><div class="hora">${hora(voo.chegada)}${voo.chegada.slice(0, 10) !== voo.partida.slice(0, 10) ? "<sup class='suave'>+1</sup>" : ""}</div><div class="suave pequeno">${sigla(voo.destino)}</div></div>
        </div>
        <div class="suave pequeno mt">${esc(voo.companhia)} · voo ${esc(voo.codigo)} · ${voo.provedor === "agencia" ? "Catálogo Mundo Viagens" : "Tempo real SkyHigh"}</div>
      </div>
      <div class="direita">
        <div class="preco">${moeda(voo.preco)}</div>
        <div class="suave pequeno">por pessoa · ${voo.assentos} lugares</div>
      </div>
      <button class="botao" data-escolher="${indice}">Selecionar</button>
    </div>`;
}

async function resultados(alvo, _, query) {
  const lista = await cidades();
  const dados = await api("/voos?" + new URLSearchParams(query));
  let filtro = "todos";
  let ordem = "preco";
  const desenhar = () => {
    let voos = dados.voos.map((voo, indice) => ({ voo, indice }));
    if (filtro !== "todos") voos = voos.filter((v) => v.voo.provedor === filtro);
    const chaves = {
      preco: (v) => v.voo.preco,
      horario: (v) => v.voo.partida,
      duracao: (v) => new Date(v.voo.chegada.replace(" ", "T")) - new Date(v.voo.partida.replace(" ", "T")),
    };
    voos.sort((a, b) => (chaves[ordem](a) > chaves[ordem](b) ? 1 : -1));
    alvo.querySelector("[data-lista]").innerHTML = voos.length
      ? voos.map((v) => cartaoVoo(v.voo, v.indice)).join("")
      : vazio(dados.indisponiveis.length ? "" : "Nenhum voo disponível nessa data. Que tal tentar outro dia?");
    alvo.querySelectorAll("[data-escolher]").forEach((botao) =>
      botao.addEventListener("click", () => {
        const voo = dados.voos[Number(botao.dataset.escolher)];
        try {
          sessionStorage.setItem("mv-selecao", JSON.stringify({ voo, passageiros: Number(query.passageiros), promocao: dados.promocao }));
        } catch {}
        location.hash = "#/reservar";
      })
    );
  };
  alvo.innerHTML = `
    <div class="titulo-pagina">
      <h1>${esc(query.origem)} → ${esc(query.destino)}</h1>
      <p>${esc(diaSemana(query.data))} · ${esc(query.passageiros)} passageiro(s) · ${dados.voos.length} opção(ões)</p>
    </div>
    <details class="cartao mb"><summary class="forte" style="cursor:pointer">Alterar busca</summary><div class="mt">${formularioBusca(lista, query)}</div></details>
    ${dados.aviso ? `<div class="alerta erro mb">${esc(dados.aviso)}</div>` : ""}
    ${dados.promocao ? `<div class="alerta sucesso mb">Promoção "${esc(dados.promocao.descricao)}": ${dados.promocao.desconto}% de desconto no pacote para ${esc(query.destino)}.</div>` : ""}
    <div class="entre mb">
      <div class="chips" data-filtros>
        <button class="chip ativo" data-filtro="todos">Todos</button>
        <button class="chip" data-filtro="agencia">Catálogo Mundo Viagens</button>
        <button class="chip" data-filtro="skyhigh">SkyHigh tempo real</button>
      </div>
      <select data-ordem style="width:auto">
        <option value="preco">Menor preço</option>
        <option value="horario">Mais cedo</option>
        <option value="duracao">Mais rápido</option>
      </select>
    </div>
    <div class="grade" data-lista></div>`;
  ligarBusca(alvo);
  alvo.querySelectorAll("[data-filtro]").forEach((chip) =>
    chip.addEventListener("click", () => {
      filtro = chip.dataset.filtro;
      alvo.querySelectorAll("[data-filtro]").forEach((c) => c.classList.toggle("ativo", c === chip));
      desenhar();
    })
  );
  alvo.querySelector("[data-ordem]").addEventListener("change", (e) => {
    ordem = e.target.value;
    desenhar();
  });
  desenhar();
}

function destinoAposLogin(perfil, voltar) {
  if (perfil !== "cliente") return "#/painel";
  return voltar ? "#" + voltar : "#/";
}

async function login(alvo, _, query) {
  if (sessao.token) {
    location.hash = destinoAposLogin(sessao.perfil, query.voltar);
    return;
  }
  alvo.innerHTML = `
    <div class="grade grade-2" style="max-width:920px;margin:20px auto 0;align-items:start">
      <div class="cartao">
        <h1>Entrar</h1>
        <p class="suave">Clientes e equipe da agência usam o mesmo acesso.</p>
        <form data-login class="grade mt">
          <div class="campo"><label>E-mail</label><input type="email" name="email" required autocomplete="email"></div>
          <div class="campo"><label>Senha</label><input type="password" name="senha" required autocomplete="current-password"></div>
          <button class="botao grande cheio" type="submit">Entrar</button>
        </form>
        <p class="suave pequeno mt">Ainda não tem conta? <a href="#/cadastro${query.voltar ? "?voltar=" + encodeURIComponent(query.voltar) : ""}">Cadastre-se</a></p>
      </div>
      <div class="cartao">
        <h2>Contas de demonstração</h2>
        <p class="suave pequeno">Clique para preencher.</p>
        <div class="contas-demo">
          <button class="botao secundario" data-demo="cliente@teste.com|cliente123"><span><strong>Cliente</strong><br><span class="suave pequeno">cliente@teste.com · cliente123</span></span></button>
          <button class="botao secundario" data-demo="funcionario@mundoviagens.com|funcionario123"><span><strong>Funcionário</strong><br><span class="suave pequeno">funcionario@mundoviagens.com · funcionario123</span></span></button>
          <button class="botao secundario" data-demo="gerente@mundoviagens.com|gerente123"><span><strong>Gerente</strong><br><span class="suave pequeno">gerente@mundoviagens.com · gerente123</span></span></button>
        </div>
      </div>
    </div>`;
  const form = alvo.querySelector("[data-login]");
  alvo.querySelectorAll("[data-demo]").forEach((botao) =>
    botao.addEventListener("click", () => {
      const [email, senha] = botao.dataset.demo.split("|");
      form.email.value = email;
      form.senha.value = senha;
    })
  );
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    executar(form.querySelector("button"), async () => {
      const resposta = await api("/auth/login", { metodo: "POST", corpo: { email: form.email.value, senha: form.senha.value } });
      sessao.salvar(resposta.token, resposta.usuario);
      avisar(`Bem-vindo(a), ${resposta.usuario.nome.split(" ")[0]}!`, "sucesso");
      window.dispatchEvent(new Event("atualizar-menu"));
      location.hash = destinoAposLogin(resposta.usuario.perfil, query.voltar);
    });
  });
}

async function cadastro(alvo, _, query) {
  alvo.innerHTML = `
    <div class="cartao" style="max-width:520px;margin:20px auto 0">
      <h1>Criar conta</h1>
      <p class="suave">Cadastre-se para reservar, acompanhar suas viagens e acumular pontos.</p>
      <form data-cadastro class="grade mt">
        <div class="campo"><label>Nome completo</label><input name="nome" required autocomplete="name"></div>
        <div class="grade grade-2">
          <div class="campo"><label>CPF</label><input name="cpf" required inputmode="numeric" placeholder="000.000.000-00"></div>
          <div class="campo"><label>Celular</label><input name="telefone" inputmode="tel" placeholder="(11) 90000-0000"></div>
        </div>
        <div class="campo"><label>E-mail</label><input type="email" name="email" required autocomplete="email"></div>
        <div class="grade grade-2">
          <div class="campo"><label>Senha</label><input type="password" name="senha" minlength="6" required autocomplete="new-password"></div>
          <div class="campo"><label>Confirmar senha</label><input type="password" name="confirmacao" minlength="6" required autocomplete="new-password"></div>
        </div>
        <button class="botao grande cheio" type="submit">Criar conta</button>
      </form>
      <p class="suave pequeno mt">Já tem conta? <a href="#/login">Entrar</a></p>
    </div>`;
  const form = alvo.querySelector("[data-cadastro]");
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (form.senha.value !== form.confirmacao.value) {
      avisar("As senhas não conferem.", "erro");
      return;
    }
    executar(form.querySelector("button"), async () => {
      const dados = Object.fromEntries(new FormData(form));
      const resposta = await api("/auth/cadastro", { metodo: "POST", corpo: dados });
      sessao.salvar(resposta.token, resposta.usuario);
      avisar("Conta criada! Boas viagens.", "sucesso");
      window.dispatchEvent(new Event("atualizar-menu"));
      location.hash = query.voltar ? "#" + query.voltar : "#/";
    });
  });
}

export const rotas = [
  { caminho: "/", area: "site", render: inicio },
  { caminho: "/voos", area: "site", titulo: "Voos", render: resultados },
  { caminho: "/login", area: "site", titulo: "Entrar", render: login },
  { caminho: "/cadastro", area: "site", titulo: "Criar conta", render: cadastro },
];
