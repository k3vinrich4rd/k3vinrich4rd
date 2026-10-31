# Metas

`metas/progresso.json` é a única fonte das metas do perfil. O workflow `perfil-diario` (e o `scripts/rodar-diario.sh`) só **desenham** o que está aqui
(no README, entre `<!-- METAS:START -->` e `<!-- METAS:END -->`, e no `progresso.md`). Ele não calcula nada:
o progresso não sobe com o tempo nem com commit qualquer.

Quem preenche `feitos` e `commits` é a rotina diária de revisão, que lê os commits novos do Kevin (mensagem,
arquivos alterados, diff e dependências) e decide pelo conteúdo se o commit conta para alguma meta.

```json
{
  "atualizado": "AAAA-MM-DD",
  "metas": [
    {
      "id": "aws",
      "titulo": "AWS na prática",
      "alvo": 10,
      "feitos": 1,
      "confirmada": true,
      "commits": [
        { "repo": "k3vinrich4rd/rkf_bank", "sha": "<sha completo>", "data": "2026-11-02T21:10:00-03:00", "motivo": "fila SQS no envio de comprovante" }
      ]
    }
  ]
}
```

| Campo | Obrigatório | O que é |
|---|---|---|
| `atualizado` | sim | dia da última classificação (aparece no rodapé da tabela) |
| `metas[].id` | sim | identificador curto, sem espaço |
| `metas[].titulo` | sim | texto exibido |
| `metas[].alvo` | sim | quantos commits completam a meta (100%) |
| `metas[].feitos` | sim | quantos commits já contaram; a barra é `feitos / alvo`, limitada a 100% |
| `metas[].confirmada` | não | `false` mostra “⏳ a confirmar” ao lado do título |
| `metas[].commits[]` | não | evidências; o mais recente aparece na coluna “Último commit que contou” |
| `commits[].repo` | sim | `dono/repo` ou só `repo` (dono = k3vinrich4rd) |
| `commits[].sha`, `data`, `motivo` | sim | SHA completo, data ISO 8601 e o porquê em uma linha |

Commit de repositório privado (ou que o token não enxerga) aparece só como “🔒 projeto privado” e a data:
sem nome, SHA, link ou motivo.

Metas atuais (confirmadas pelo Kevin, estudadas em conjunto): `java` (Java avançado, alvo 20), `aws` (AWS na prática, alvo 15) e `ia` (IA aplicada: Spring AI, LLM, RAG, agentes; alvo 15). **Um mesmo commit pode contar para mais de uma meta**: basta listá-lo em `commits` de cada uma e somar em `feitos` de cada uma.
