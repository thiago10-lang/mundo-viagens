# Mundo Viagens · Frontend

Interface web do sistema da agência Mundo Viagens: site do cliente e painel da equipe. HTML, CSS e JavaScript puros (sem etapa de build), consumindo a API separada.

- Site: https://mundo-viagens-web.onrender.com
- API: https://github.com/thiago10-lang/mundo-viagens-api

## Funcionalidades
**Cliente:** busca de voos em tempo real, compra de passagens e pacotes com hotel, vários passageiros por reserva, pagamento com cartão, Pix ou boleto, cupons de desconto, programa de pontos com níveis Bronze/Prata/Ouro, check-in online com mapa de assentos, bilhete eletrônico com QR Code (imprimível em PDF), cancelamento com simulação de multa, notificações e central de atendimento.

**Funcionário:** visão geral da operação, consulta de reservas, confirmação de pagamentos por boleto, ficha do cliente, atendimento de chamados e relatórios com exportação em CSV.

**Gerente:** tudo do funcionário, mais bloqueio de clientes, criação de viagens, hotéis, promoções e cupons, configuração de valores, gestão de funcionários e auditoria.

## Executar localmente
Com a API rodando em http://127.0.0.1:5000, sirva esta pasta com qualquer servidor estático (por exemplo `python -m http.server 8080`) e acesse http://127.0.0.1:8080. Se as pastas `mundo-viagens-api` e `mundo_viagens` estiverem lado a lado, basta rodar a API e abrir http://127.0.0.1:5000.

O endereço da API fica em `js/config.js`.

## Contas de demonstração
| Perfil | E-mail | Senha |
|---|---|---|
| Cliente | cliente@teste.com | cliente123 |
| Funcionário | funcionario@mundoviagens.com | funcionario123 |
| Gerente | gerente@mundoviagens.com | gerente123 |
