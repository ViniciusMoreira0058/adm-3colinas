# ADM 3Colinas

App da equipe ADM do **Legendários · Base 3 Colinas (Franca - SP)** para gerenciar cada TOP: senderistas e legendários (atestado, termo, grupo e família), checklist, estoque e kits MRE, km da pista, histórico de TOPs e cadastro da equipe com acesso por aba.

É um site estático, sem etapa de build: `index.html` + `app.js` + `dados.js`. Usa o Supabase para login, banco de dados e tempo real, e é publicado na Vercel. Instala no celular como app (PWA).

Abrindo `index.html` sem preencher o Supabase (ou com `?demo=1` no endereço), o app roda em **modo demonstração**, com senderistas e equipe fictícios só na memória.

## Acesso

| Nível | O que faz |
|---|---|
| **Dono** | Tudo, inclusive a aba **Usuários** (cadastro da equipe, último acesso e quem está online) |
| **Acesso total** | Vê e altera todas as abas, inclusive iniciar e finalizar TOPs |
| **Edita as abas escolhidas** | Vê e altera só as abas que o dono marcou |
| **Somente leitura** | Vê as abas marcadas, sem alterar nada |

As permissões são conferidas no banco (RLS), não só na tela. Bloquear alguém corta o acesso na hora.

## Colocar no ar

1. **Supabase**: o app usa o mesmo projeto do Bold (`jgoewqyfihdzpurlvaxe`). As tabelas deste app começam com `adm_` e não se misturam com as do Bold. Quem já tem login no Bold entra aqui com o mesmo e-mail e senha.
   Confira o e-mail do dono no fim do `supabase/schema.sql` (seção 8, hoje `barbeariavm0058@gmail.com`). Vá em **SQL Editor → New query**, cole o arquivo inteiro e clique em **Run**. Ele já cria o checklist, o estoque, a pista e o TOP 1922 da planilha.
2. **app.js**: `SUPABASE_URL` e `SUPABASE_KEY` já estão preenchidos com o projeto do Bold. Para trocar de projeto, mude essas duas linhas. O URL fica em **Connect** (botão no alto) ou é `https://<código-do-projeto>.supabase.co`. Use a chave **anon / publishable**. Nunca coloque a *service_role / secret key*.
3. **Vercel**: **Add New → Project** → importe este repositório → **Deploy**. Não precisa configurar nada.
4. **Supabase → Authentication → URL Configuration**: em **Redirect URLs** adicione o endereço da Vercel (ex.: `https://adm-3colinas.vercel.app`). Se o projeto for só deste app, coloque o mesmo endereço também em **Site URL**. Se estiver usando o projeto do Bold, **não mude o Site URL**, só adicione o Redirect URL.
5. **Primeiro acesso do dono**: abra o app, toque em **Primeiro acesso? Criar minha senha**, use o e-mail do passo 1 e confirme pelo link que chega no e-mail.
6. **Equipe**: na aba **Usuários**, cadastre cada pessoa com o e-mail dela e escolha o nível e as abas. Toque em **Enviar no WhatsApp**: a pessoa recebe o link e cria a própria senha em **Primeiro acesso**.
7. **Senderistas**: em **Senderistas** e **Legendários**, use **Colar da planilha** para trazer os nomes da planilha. (Os dados pessoais não ficam no GitHub, só no banco.)
8. **Histórico de alterações** (só o dono vê): se o banco foi criado antes dele existir, rode também `supabase/historico.sql` no SQL Editor. Ele registra quem criou, alterou ou apagou cada coisa e permite restaurar o que foi apagado.
9. **Relatório de inscrições**: em Senderistas ou Legendários, toque em **Importar relatório** e envie a planilha de inscritos da plataforma (.xlsx). O app só adiciona quem ainda não está, ignora compras canceladas e não importa o CPF. Tem um exemplo fictício em `exemplo/relatorio-exemplo.xlsx` para testar no modo demonstração (`?demo=1`).
10. **No celular**: abra o endereço da Vercel e toque em **Adicionar à tela inicial** (iPhone: botão Compartilhar; Android: menu ⋮ → Instalar app).

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | Telas, estilos, abertura animada e tela de login |
| `app.js` | Lógica do app (abas, formulários, permissões na tela, login) |
| `dados.js` | Ligação com o banco: Supabase em tempo real ou memória (demonstração) |
| `demo.js` | Dados fictícios do modo demonstração |
| `supabase/schema.sql` | Tabelas, permissões (RLS), funções, histórico e dados iniciais |
| `supabase/historico.sql` | Só o histórico de alterações, para quem já tinha rodado o schema antes |
| `supabase/push.sql` | Notificações com o app fechado (aparelhos, gatilho que chama `api/push`) |
| `api/push.js`, `package.json` | Função da Vercel que entrega as notificações (Web Push) |
| `manifest.webmanifest`, `sw.js`, `icons/` | Instalação como app no celular |

## Segurança

- RLS em todas as tabelas (prefixo `adm_`). Cada pessoa só lê e grava as abas liberadas para ela.
- Só entra quem foi cadastrado em Usuários: um e-mail desconhecido cria a conta mas não vê nada.
- A conta do dono não pode ser bloqueada nem excluída. Trocar o e-mail de alguém desfaz o vínculo com o login antigo.
- A chave do Supabase no `app.js` é a pública (anon). A proteção dos dados está no RLS.

## Sem internet (modo offline)

Depois de entrar uma vez com internet, o app abre e funciona sem conexão (útil no TOP e na trilha). Os dados ficam guardados no aparelho e as alterações vão para uma fila que é enviada sozinha quando a internet volta. O selo **Offline · N para enviar** mostra o que ainda falta enviar. Se duas pessoas mudarem o mesmo campo, vale a última alteração que chegar ao servidor. Importar relatório, Usuários e Histórico precisam de internet. Também dá para entrar sem internet: quem já entrou com e-mail e senha neste aparelho (com internet) consegue entrar de novo offline com a mesma senha. O app guarda só uma "impressão" protegida da senha (PBKDF2), nunca a senha. Ao sair, os dados ficam no aparelho; marque "Apagar os dados guardados neste aparelho" em celular que não é seu.

## Cronograma

A aba **Cronograma** mostra o cronograma do TOP por dia (D1 a D4), com as cores da planilha (prédica, refeição, destaque). O ADM toca em **Iniciar** quando o momento começa e em **Terminar** quando acaba; o app mostra o atraso em relação ao horário previsto e quem marcou. Dá para corrigir um horário tocando nele e para adicionar, editar ou apagar momentos (vale só para o TOP atual). O cronograma padrão fica em `cronograma.js`. Não precisa rodar SQL: os dados ficam na tabela `adm_docs` (coleção `config`).

Cada ADM marca o **próprio cronograma** (`config/crono-<top>-adm-<membro>`), então ninguém sobrescreve o horário de outro. O dono separa os ADMs em **equipes** e escolhe os **coordenadores** (botão Equipes). O ADM vê o dele e, só para leitura, o dos colegas de equipe; o dono e os coordenadores veem os de todos, agrupados por equipe. O PDF leva o nome do ADM no cabeçalho e pode sair de um ADM, de uma equipe inteira ou de todos.

## Consagração

A aba **Consagração** acompanha os 40 dias de consagração. Todo dia um ADM toca em **Colar lista do dia** e cola a lista do grupo (numeração, emojis e nomes repetidos são ignorados). O app soma quantas vezes cada pessoa participou, com filtro por período, e exporta o PDF **Lista Consagração** de um dia ou de um período, com o ADM responsável no cabeçalho. O botão **Enviar no WhatsApp** abre o compartilhar do celular com o PDF anexado (no computador, baixa o PDF e abre o WhatsApp). Os dados ficam em `adm_docs` (coleção `config`: `consag-<data>` e `consag-cfg`). Para um ADM ver a aba, libere "Consagração" no cadastro dele em Usuários. O app aponta nomes que parecem ser da mesma pessoa (nome parecido, erro de digitação, e-mail pessoal e da empresa) para unir ou marcar "não é a mesma"; também dá para unir dois nomes na mão (Unir nomes) e separar depois na ficha da pessoa. As uniões ficam em `config/consag-alias`.

## Notificações com o app fechado

Quem toca em **Ativar notificações** recebe aviso no celular mesmo com o app fechado (no iPhone, só com o app instalado na tela inicial, iOS 16.4 ou mais novo). O dono recebe tudo que os outros ADMs mudam (cadastros, cronograma, consagração, pins), agrupado quando muda muita coisa de uma vez; os ADMs recebem só **planilha importada** e **novidade do app** (Usuários → Avisar novidade, que também aparece como explicação quando o ADM abre o app). Funciona assim: o banco (gatilho em `adm_docs`, `supabase/push.sql`) chama `https://adm-3colinas.vercel.app/api/push`, que envia pelo Web Push. Para ligar, rode `supabase/push.sql` no SQL Editor com a chave privada VAPID no lugar indicado (a chave pública está em `app.js` e `api/push.js`). A chave privada nunca vai para o GitHub.

