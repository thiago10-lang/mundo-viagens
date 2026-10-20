export function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function moeda(valor) {
  return formatoMoeda.format(Number(valor) || 0);
}

export function dataBR(texto) {
  if (!texto) return "";
  const [ano, mes, dia] = texto.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function dataHoraBR(texto) {
  if (!texto) return "";
  return `${dataBR(texto)} ${texto.slice(11, 16)}`;
}

export function hora(texto) {
  return texto ? texto.slice(11, 16) : "";
}

export function diaSemana(texto) {
  const data = new Date(texto.slice(0, 10) + "T12:00:00");
  return data.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export function duracao(inicio, fim) {
  const minutos = Math.round((new Date(fim.replace(" ", "T")) - new Date(inicio.replace(" ", "T"))) / 60000);
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;
}

export function sigla(cidade) {
  const siglas = {
    "São Paulo": "GRU", "Rio de Janeiro": "GIG", "Brasília": "BSB", "Belo Horizonte": "CNF", "Salvador": "SSA",
    "Recife": "REC", "Fortaleza": "FOR", "Florianópolis": "FLN", "Porto Alegre": "POA", "Manaus": "MAO",
    "Buenos Aires": "EZE", "Santiago": "SCL", "Lisboa": "LIS", "Paris": "CDG", "Orlando": "MCO",
  };
  return siglas[cidade] || cidade.slice(0, 3).toUpperCase();
}

export function cpfFormatado(cpf) {
  const d = String(cpf || "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf || "";
}

export const ROTULOS_STATUS = { pendente: "Pendente", confirmada: "Confirmada", cancelada: "Cancelada", aberto: "Aberto", respondido: "Respondido", fechado: "Fechado" };
export const ROTULOS_FORMA = { cartao: "Cartão de crédito", pix: "Pix", boleto: "Boleto" };

export function selo(status) {
  return `<span class="selo ${esc(status)}">${esc(ROTULOS_STATUS[status] || status)}</span>`;
}

export function estrelas(n) {
  return `<span class="estrelas">${"★".repeat(n)}</span>`;
}

export function avisar(mensagem, tipo = "") {
  const caixa = document.getElementById("avisos");
  const item = document.createElement("div");
  item.className = `aviso-flutuante ${tipo}`;
  item.textContent = mensagem;
  caixa.appendChild(item);
  setTimeout(() => item.remove(), 4500);
}

export function carregando(texto = "Carregando...") {
  return `<div class="carregando"><div class="giro"></div><div>${esc(texto)}</div></div>`;
}

export function vazio(texto) {
  return `<div class="vazio">${esc(texto)}</div>`;
}

export function abrirModal(html, { largo = false } = {}) {
  const fundo = document.createElement("div");
  fundo.className = "fundo-modal";
  fundo.innerHTML = `<div class="modal ${largo ? "largo" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  const fechar = () => {
    fundo.remove();
    document.removeEventListener("keydown", tecla);
  };
  const tecla = (e) => e.key === "Escape" && fechar();
  document.addEventListener("keydown", tecla);
  fundo.addEventListener("click", (e) => {
    if (e.target === fundo || e.target.closest("[data-fechar]")) fechar();
  });
  document.body.appendChild(fundo);
  return { elemento: fundo.querySelector(".modal"), fechar };
}

export function confirmar(titulo, texto, rotuloBotao = "Confirmar", perigo = false) {
  return new Promise((resolver) => {
    const { elemento, fechar } = abrirModal(`
      <h2>${esc(titulo)}</h2>
      <p class="suave">${texto}</p>
      <div class="acoes mt" style="justify-content:flex-end">
        <button class="botao secundario" data-fechar>Voltar</button>
        <button class="botao ${perigo ? "perigo" : ""}" data-ok>${esc(rotuloBotao)}</button>
      </div>`);
    elemento.querySelector("[data-ok]").addEventListener("click", () => {
      fechar();
      resolver(true);
    });
    elemento.querySelectorAll("[data-fechar]").forEach((b) => b.addEventListener("click", () => resolver(false)));
  });
}

export function dadosFormulario(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export async function executar(botao, tarefa) {
  const texto = botao?.innerHTML;
  if (botao) {
    botao.disabled = true;
    botao.innerHTML = "Aguarde...";
  }
  try {
    return await tarefa();
  } catch (erro) {
    avisar(erro.message, "erro");
    return undefined;
  } finally {
    if (botao && botao.isConnected) {
      botao.disabled = false;
      botao.innerHTML = texto;
    }
  }
}

export function grafico(itens, rotulo, valor, formatar = (v) => v) {
  if (!itens.length) return vazio("Sem dados no período.");
  const maximo = Math.max(...itens.map(valor), 1);
  return `<div class="barras">${itens
    .map(
      (item) => `<div class="barra" title="${esc(rotulo(item))}: ${esc(formatar(valor(item)))}">
        <span class="valor-barra">${esc(formatar(valor(item)))}</span>
        <div class="coluna" style="height:${Math.max((valor(item) / maximo) * 100, 2)}%"></div>
        <small>${esc(rotulo(item))}</small>
      </div>`
    )
    .join("")}</div>`;
}

export function compacto(valor) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(valor);
}

export function hojeISO(dias = 0) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
