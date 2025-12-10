# API do projeto "iScout"

Projeto utilizado como artefato desenvolvido durante a disciplicina Projeto Integrador I (EAD), ministrada pelo professor Me. Augusto César, no curso de Bacharelado em Sistemas de Informação.

## Arquitetura

Arquitetura MVC, onde cada funcionalidade está isolada em seu módulo, com regras de validação individuais.

Tecnologias utilizadas:

- Elysia
- Drizzle (ORM)
- PostgreSQL (Banco)

## Hospedagem

O projeto está hospedado em uma máquina da Oracle, com 1ocpu e 1 gb de RAM, rodando em Ubuntu 24.04. Com reverse proxy configurada sob Nginx - sem domínio.

## Como rodar

Requisitos:

- bun
- Docker

Comandos:

- `bun install`
  - Instala todas as bibliotecas utilizadas
- `docker compose -f docker-compose.dev.yml up`
  - Sobe banco de dados com credenciais:
    - Usuário: `username`
    - Senha: `mypassword`
    - Schema: `database`
    - Porta: `5432`

Configure o `.env`, os valores padrão do `.env.example` já servem.

- `copy .env.example .env`
- `bun db:push`
  - Carrega todos o schema do banco ao banco de dados em si.
- `bun db:seed`
  - Se quiser seedar o banco criado e configurado já com dados para testes.
- `bun dev`
  - Inicializa a aplicação (com watchfile) na porta definida no `.env`, por padrão, 3000.
