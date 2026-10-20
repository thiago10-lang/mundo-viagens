import { API_URL } from "./config.js";

const CHAVE = "mundo-viagens-sessao";

export const sessao = {
  ler() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE)) || {};
    } catch {
      return {};
    }
  },
  get token() {
    return this.ler().token;
  },
  get usuario() {
    return this.ler().usuario;
  },
  get perfil() {
    return this.usuario?.perfil;
  },
  salvar(token, usuario) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ token, usuario }));
    } catch {}
  },
  atualizarUsuario(usuario) {
    this.salvar(this.token, { ...this.usuario, ...usuario });
  },
  limpar() {
    try {
      localStorage.removeItem(CHAVE);
    } catch {}
  },
};

export async function api(caminho, { metodo = "GET", corpo, bruto = false } = {}) {
  const cabecalhos = {};
  if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
  if (sessao.token) cabecalhos.Authorization = "Bearer " + sessao.token;
  let resposta;
  try {
    resposta = await fetch(API_URL + "/api" + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
  }
  if (resposta.status === 401 && sessao.token) {
    sessao.limpar();
    window.dispatchEvent(new Event("sessao-expirada"));
  }
  if (bruto) {
    if (!resposta.ok) throw new Error("Não foi possível gerar o arquivo.");
    return resposta;
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro || "Não foi possível concluir a operação.");
  return dados;
}
