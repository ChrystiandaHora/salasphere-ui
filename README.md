# 🎨 SalaSphere Front-end — SPA Reativa Premium (Front-end)

Este é o front-end do **SalaSphere**, uma aplicação web elegante e reativa no modelo **Single Page Application (SPA)**, projetada com HTML, CSS e JavaScript puro (Vanilla JS) para a gestão completa de coworkings, salas e agendamentos.

## Key Features

- **Tema Glassmorphism Escuro**: Design futurista com backdrop-filters semi-transparentes de desfoque.
- **Micro-animações Ricas**: Hover com efeito *glow* em cards de salas, toasts deslizantes e shakes de erros físicos.
- **Timeline de 24 Horas**: Visualizações diária e semanal expandidas para cobrir todas as 24h do dia.
- **Sincronização Automática de Fuso**: Interceptador nativo do `fetch` que envia o fuso horário geográfico do cliente no header `X-Timezone`.
- **Ajuste Dinâmico no Mês (Hoje)**: Correção automática de slot no calendário mensal caso o horário comercial padrão já tenha passado no dia atual.
- **Visualização de Janelas de Manutenção**: Bloques visuais de manutenção (laranja/âmbar) integrados com a timeline e calculados em tempo real.
- **Templates Nativos HTML**: Utilização de tags `<template>` para renderização de cards e tabelas no lugar de strings de concatenação pesadas no JS.

---

## Tech Stack

- **Linguagem**: JavaScript Vanilla (ES6+)
- **Estruturação**: HTML5 Semântico com ARIA roles
- **Estilização (CSS)**: CSS3 customizado ([styles.css](css/styles.css)) com overrides do Bootstrap 5.3
- **Integração de Rede**: Chamadas assíncronas assentes na Fetch API

---

## Prerequisites

Para rodar a aplicação, é necessário apenas ter o back-end da API rodando localmente (por padrão no endereço `http://127.0.0.1:5000`).

---

## Módulos e Funcionalidades

### 1. 🔐 Autenticação e Guarda de Rotas (`index.html`)
* Formulário deslizante unificando Login e Cadastro.
* Scripts de segurança (`auth.js`) contendo guards que barram o acesso direto a páginas internas caso não haja sessão ativa gravada em `localStorage`.
* **Interceptador Fetch**: Injeta de forma global o header `X-Timezone` (detectando o fuso pelo navegador do cliente via `Intl.DateTimeFormat().resolvedOptions().timeZone`) em qualquer requisição disparada à API.

### 2. 📊 Dashboard Administrativo (`dashboard/`)
* **Estatísticas Rápidas**: Contadores reativos de salas (totais, livres, em manutenção) e reservas.
* **Templates Reutilizáveis**: Renderização de usuários e salas por meio de `<template>` clonados do HTML, garantindo performance e legibilidade de código.
* **Filtros Dinâmicos**: Exibição e ordenação de salas por status, incluindo salas "Em Manutenção" com cálculo de status em tempo real.
* **Painel Offcanvas**: Formulários deslizantes para cadastro, edições e remoções de salas e gerenciamento completo de credenciais e permissões de usuários.

### 3. 📅 Timeline e Agenda Reativa (`salas/`)
Acesso profundo às agendas de reservas e manutenções de cada sala, operado a partir de três modos de visualização:
* **Aba Dia**: Linha do tempo vertical cobrindo as **24 horas do dia** (de `00:00` a `23:00`), com rolagem automática para focar na hora corrente. Slots do passado ficam inativos de forma inteligente.
* **Aba Semana**: Grade contendo os 7 dias da semana das `00:00` às `23:00` para planejamento ágil de médio prazo.
* **Aba Mês**: Calendário clássico mensal com sinalizações dinâmicas.
  * **Correção Dinâmica**: Clicar na célula do dia de "Hoje" após o horário comercial padrão ajusta automaticamente o início do agendamento para a **próxima hora cheia futura** (evitando o travamento por data retroativa e simplificando o fluxo).
* **Delegação de Eventos**: Cliques e navegação gerenciados por meio de escutas centrais utilizando atributos declarativos `data-action`, evitando injeções de inline onclick complexas no JavaScript.

---

## Como Executar

### Opção 1: Abertura Direta (Sem Servidor)
1. Certifique-se de que a API Flask (back-end) esteja rodando.
2. Dê um **duplo-clique** no arquivo **`index.html`** da pasta raiz do front-end para abri-lo instantaneamente no navegador.

### Opção 2: Servidor Estático Local (Recomendado)
Para evitar bloqueios de segurança do navegador no carregamento de rotas locais em SPA, execute um servidor estático local:

```bash
# Usando Python nativo
python3 -m http.server 8000

# Ou usando Node.js (serve)
npm install -g serve
serve
```
Acesse em `http://localhost:8000` ou pelo link gerado pelo terminal.
