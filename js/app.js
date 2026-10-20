import { api, sessao } from "./api.js";
import { avisar, carregando, esc } from "./ui.js";
import * as publico from "./paginas/publico.js";
import * as cliente from "./paginas/cliente.js";
import * as equipe from "./paginas/equipe.js";
import * as gerente from "./paginas/gerente.js";

const rotas = [...publico.rotas, ...cliente.rotas, ...equipe.rotas, ...gerente.rotas].map((rota) => {
  const nomes = [];
  const padrao = new RegExp("^" + rota.caminho.replace(/:(\w+)/g, (_, nome) => (nomes.push(nome), "([^/]+)")) + "$");
  return { ...rota, padrao, nomes };
});

const ICONE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;

const MENU_EQUIPE = [
  { grupo: "Operação" },
  { href: "#/painel", texto: "Visão geral" },
  { href: "#/painel/reservas", texto: "Reservas" },
  { href: "#/painel/clientes", texto: "Clientes" },
  { href: "#/painel/atendimento", texto: "Atendimento" },
  { href: "#/painel/relatorios", texto: "Relatórios" },
  { href: "#/painel/hoteis", texto: "Hotéis" },
  { grupo: "Gestão", perfil: "gerente" },
  { href: "#/painel/voos", texto: "Voos e viagens", perfil: "gerente" },
  { href: "#/painel/promocoes", texto: "Promoções e cupons", perfil: "gerente" },
  { href: "#/painel/equipe", texto: "Funcionários", perfil: "gerente" },
  { href: "#/painel/configuracoes", texto: "Configurações", perfil: "gerente" },
  { href: "#/painel/auditoria", texto: "Auditoria", perfil: "gerente" },
];

function marcarAtivo(caminho) {
  document.querySelectorAll("[data-menu] a[href^='#/']").forEach((link) => {
    const destino = link.getAttribute("href").slice(1);
    const ativo = destino === caminho || (destino !== "/" && destino !== "/painel" && caminho.startsWith(destino));
    link.classList.toggle("ativo", ativo);
  });
}

function layoutSite() {
  const usuario = sessao.usuario;
  const links = usuario
    ? `<a href="#/">Buscar voos</a>
       <a href="#/minhas-viagens">Minhas viagens</a>
       <a href="#/atendimento">Atendimento</a>
       <a href="#/notificacoes" aria-label="Notificações">Notificações<span class="contador" id="contador" hidden></span></a>
       <a href="#/perfil">${esc(usuario.nome.split(" ")[0])}</a>
       <button class="link" data-sair>Sair</button>`
    : `<a href="#/">Buscar voos</a><a href="#/login">Entrar</a><a class="botao pequeno" href="#/cadastro" style="color:#fff">Criar conta</a>`;
  return `
    <header class="topo"><div class="topo-interno">
      <a class="marca" href="#/"><span class="marca-icone">${ICONE}</span>Mundo Viagens</a>
      <nav class="menu" data-menu>${links}</nav>
    </div></header>
    <main class="conteudo" id="conteudo"></main>
    <footer class="rodape">Mundo Viagens · Agência de turismo desde 2011 · São Paulo</footer>`;
}

function layoutPainel() {
  const usuario = sessao.usuario;
  const itens = MENU_EQUIPE.filter((item) => !item.perfil || item.perfil === usuario.perfil)
    .map((item) => (item.grupo ? `<div class="rotulo-grupo">${item.grupo}</div>` : `<a href="${item.href}">${item.texto}</a>`))
    .join("");
  return `
    <div class="painel">
      <aside class="lateral">
        <a class="marca" href="#/painel"><span class="marca-icone">${ICONE}</span>Mundo Viagens</a>
        <nav data-menu>${itens}<button data-sair>Sair</button></nav>
        <div class="usuario"><strong>${esc(usuario.nome)}</strong>${usuario.perfil === "gerente" ? "Gerente" : "Funcionário"}</div>
      </aside>
      <main class="conteudo" id="conteudo"></main>
    </div>`;
}

let areaAtual = null;

function montarLayout(area) {
  const chave = `${area}:${sessao.perfil || ""}:${sessao.usuario?.nome || ""}`;
  if (areaAtual === chave) return;
  areaAtual = chave;
  document.getElementById("layout").innerHTML = area === "painel" ? layoutPainel() : layoutSite();
  document.querySelectorAll("[data-sair]").forEach((botao) =>
    botao.addEventListener("click", () => {
      sessao.limpar();
      areaAtual = null;
      location.hash = "#/";
      navegar();
    })
  );
}

async function atualizarContador() {
  const contador = document.getElementById("contador");
  if (!contador || sessao.perfil !== "cliente") return;
  try {
    const eu = await api("/me");
    sessao.atualizarUsuario(eu);
    contador.textContent = eu.nao_lidas;
    contador.hidden = !eu.nao_lidas;
  } catch {}
}

let navegacao = 0;

async function navegar() {
  const numero = ++navegacao;
  const [caminho, busca = ""] = (location.hash.slice(1) || "/").split("?");
  const query = Object.fromEntries(new URLSearchParams(busca));
  let rota = rotas.find((r) => r.padrao.test(caminho)) || rotas.find((r) => r.caminho === "/");
  const valores = caminho.match(rota.padrao) || [];
  const params = Object.fromEntries(rota.nomes.map((nome, i) => [nome, decodeURIComponent(valores[i + 1] || "")]));
  const perfil = sessao.perfil;
  if (rota.perfis && !rota.perfis.includes(perfil)) {
    if (!perfil) {
      location.hash = "#/login?voltar=" + encodeURIComponent(location.hash.slice(1));
    } else {
      avisar("Esta área não está disponível para o seu perfil.", "erro");
      location.hash = perfil === "cliente" ? "#/" : "#/painel";
    }
    return;
  }
  if (perfil && perfil !== "cliente" && rota.area !== "painel" && !["/login"].includes(caminho)) {
    location.hash = "#/painel";
    return;
  }
  montarLayout(rota.area);
  marcarAtivo(caminho);
  document.title = rota.titulo ? `${rota.titulo} · Mundo Viagens` : "Mundo Viagens";
  const alvo = document.getElementById("conteudo");
  alvo.innerHTML = carregando(rota.area === "painel" ? "Carregando..." : "Carregando... a primeira conexão do dia pode levar até 1 minuto.");
  window.scrollTo(0, 0);
  try {
    await rota.render(alvo, params, query, () => numero === navegacao);
  } catch (erro) {
    if (numero === navegacao) alvo.innerHTML = `<div class="alerta erro">${esc(erro.message)}</div>`;
  }
  atualizarContador();
}

window.addEventListener("hashchange", navegar);
window.addEventListener("atualizar-menu", () => {
  areaAtual = null;
  const caminho = (location.hash.slice(1) || "/").split("?")[0];
  const conteudo = document.getElementById("conteudo");
  const guardado = conteudo ? Array.from(conteudo.childNodes) : [];
  const rota = rotas.find((r) => r.padrao.test(caminho));
  montarLayout(rota?.area || "site");
  const novo = document.getElementById("conteudo");
  guardado.forEach((no) => novo.appendChild(no));
  marcarAtivo(caminho);
  atualizarContador();
});
window.addEventListener("sessao-expirada", () => {
  areaAtual = null;
  avisar("Sua sessão expirou. Entre novamente.", "erro");
  location.hash = "#/login";
});

navegar();
