# SalaSphere Front-end — SPA Reativa Premium (Front-end)

Este é o front-end do **SalaSphere**, uma aplicação web elegante e reativa no modelo **Single Page Application (SPA)**, projetada com HTML, CSS e JavaScript puro (Vanilla JS) para a gestão completa de coworkings, salas e agendamentos.

## Key Features

- **Tema Glassmorphism Escuro**: Design futurista com backdrop-filters semi-transparentes de desfoque.
- **Micro-animações**: Hover com efeito *glow* em cards de salas e toasts deslizantes.
- **Timeline de 24 Horas**: Visualizações diária e semanal expandidas para cobrir todas as 24h do dia.
- **Ajuste Dinâmico de Horário**: Ao abrir uma nova reserva para o dia atual em um horário que já passou, o início é corrigido automaticamente para a próxima hora cheia futura.
- **Visualização de Janelas de Manutenção**: Blocos visuais de manutenção (laranja/âmbar) integrados com a timeline e calculados em tempo real.
- **Templates Nativos HTML**: Uso de tags `<template>` para renderização dos cards de sala e da tabela de usuários no dashboard.

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

### 1. Roteamento e Autenticação
* `index.html` (raiz): redirecionador que verifica a sessão em `localStorage` e encaminha para `home/` ou `dashboard/`.
* `home/index.html`: formulário deslizante unificando Login e Cadastro.
* `js/auth.js`: guards que barram o acesso direto às páginas internas caso não haja sessão ativa.

### 2. Dashboard Administrativo (`dashboard/`)
* **Estatísticas Rápidas**: Contadores reativos de salas (totais, livres, em manutenção) e reservas.
* **Templates Reutilizáveis**: Cards de sala e linhas de usuário renderizados a partir de `<template>` clonados do HTML.
* **Filtros Dinâmicos**: Exibição e ordenação de salas por status, incluindo salas "Em Manutenção" com cálculo de status em tempo real.
* **Painel Offcanvas**: Formulários deslizantes para cadastro, edições e remoções de salas e gerenciamento completo de credenciais e permissões de usuários.

### 3. Timeline e Agenda Reativa (`salas/`)
Acesso profundo às agendas de reservas e manutenções de cada sala, operado a partir de três modos de visualização:
* **Aba Dia**: Linha do tempo vertical cobrindo as **24 horas do dia** (de `00:00` a `23:00`), com rolagem automática para focar na hora corrente. Slots do passado ficam inativos de forma inteligente.
* **Aba Semana**: Grade contendo os 7 dias da semana das `00:00` às `23:00` para planejamento ágil de médio prazo.
* **Aba Mês**: Calendário clássico mensal com sinalizações dinâmicas.
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
