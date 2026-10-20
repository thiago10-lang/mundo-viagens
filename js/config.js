const local = ["localhost", "127.0.0.1"].includes(location.hostname);

export const API_URL = local
  ? (location.port === "5000" ? "" : "http://127.0.0.1:5000")
  : "https://mundo-viagens-api.onrender.com";
