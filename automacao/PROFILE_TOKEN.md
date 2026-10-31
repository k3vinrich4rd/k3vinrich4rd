# Tokens do workflow `perfil-diario`

O workflow `.github/workflows/perfil-diario.yml` roda todo dia às 12:00 UTC (09:00 em Brasília), pelo botão
**Run workflow** e por `repository_dispatch`. O commit diário sai com **autor e committer = Kevin**
(`vars.KEVIN_EMAIL`, padrão `kevinrichardve@gmail.com`, o e-mail verificado da conta), por isso conta na ofensiva.
Commits do `github-actions[bot]` não contam.

> Nunca cole um token em chat, issue, commit ou arquivo. Ele só vai no campo de secret do GitHub.

## 1. `PROFILE_TOKEN`: escrita só no repositório do perfil (obrigatório)

1. Entre em <https://github.com/settings/personal-access-tokens/new>
   (foto → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**).
2. **Token name:** `perfil-diario (escrita)`. **Expiration:** 1 ano (anote a data para renovar).
3. **Resource owner:** `k3vinrich4rd`.
4. **Repository access:** **Only select repositories** → `k3vinrich4rd/k3vinrich4rd`.
5. **Permissions → Repository permissions → Contents:** **Read and write**
   (o **Metadata: Read-only** entra sozinho). Nada além disso.
6. **Generate token** e copie o valor (ele só aparece uma vez).
7. Abra <https://github.com/k3vinrich4rd/k3vinrich4rd/settings/secrets/actions> →
   **New repository secret** → **Name:** `PROFILE_TOKEN` → cole o valor → **Add secret**.

## 2. `PROFILE_READ_TOKEN`: leitura de todos os repositórios (recomendado)

O fine-grained PAT aplica a mesma permissão a todos os repositórios escolhidos. Para não dar escrita em tudo,
a leitura dos outros repositórios (inclusive privados) usa um segundo token só-leitura:

1. Mesmo caminho: **Generate new token**. **Name:** `perfil-diario (leitura)`. **Expiration:** 1 ano.
2. **Repository access:** **All repositories**.
3. **Permissions → Repository permissions → Contents:** **Read-only**. Mais nada.
4. Cadastre como secret `PROFILE_READ_TOKEN` no mesmo lugar do passo 1.7.

Sem `PROFILE_READ_TOKEN` o workflow usa o `PROFILE_TOKEN`, e sem os dois usa o `GITHUB_TOKEN`
(só repositórios públicos; o job mostra um aviso amarelo). Repositório privado nunca aparece com nome,
mensagem ou link: só “projeto privado” e a data.

## 3. Opcional: e-mail e nome do autor

<https://github.com/k3vinrich4rd/k3vinrich4rd/settings/variables/actions> → **New repository variable**:
`KEVIN_EMAIL` (um e-mail **verificado** em <https://github.com/settings/emails>) e `KEVIN_NOME`.

## 4. Testar

Aba **Actions** → **Perfil diário** → **Run workflow** → `main`. Depois confira em
<https://github.com/k3vinrich4rd/k3vinrich4rd/commits/main> se o commit `docs(diario): AAAA-MM-DD` aparece
com a sua foto (não a do bot).

## 5. Opcional: atualizar o perfil a cada push em outro repositório (ex.: `rkf_bank`)

No repositório de origem (pelo Git Flow do time: branch `ci/avisar-perfil` → PR para a `develop`):

1. Cadastre lá um secret `PROFILE_DISPATCH_TOKEN` com o **mesmo valor do `PROFILE_TOKEN`**
   (o `repository_dispatch` exige Contents: write no repositório de destino, que é só o do perfil).
2. Crie `.github/workflows/avisar-perfil.yml`:

```yaml
name: Avisar o perfil
on:
  push:
    branches: [main, develop]
permissions: {}
jobs:
  avisar:
    runs-on: ubuntu-latest
    steps:
      - name: repository_dispatch no k3vinrich4rd/k3vinrich4rd
        env:
          TOKEN: ${{ secrets.PROFILE_DISPATCH_TOKEN }}
        run: |
          [ -n "$TOKEN" ] || { echo "sem PROFILE_DISPATCH_TOKEN: nada a fazer"; exit 0; }
          curl -sf -X POST \
            -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
            https://api.github.com/repos/k3vinrich4rd/k3vinrich4rd/dispatches \
            -d '{"event_type":"projeto-push"}'
```

Em repositório privado, o payload não leva nome de repositório nem mensagem de commit de propósito.
