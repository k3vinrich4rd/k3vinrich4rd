# Metas

Próximos estudos, **em conjunto: Java + AWS + IA**. Cada meta é medida pela **porcentagem dos cursos dela**:
percentual da meta = **média dos cursos com percentual conhecido**. Curso com `"percentual": null` aparece como
“a atualizar” e fica fora da média. Nada sobe com o tempo nem com commit: o número vem do progresso registrado do curso.

`metas/progresso.json` é a única fonte. `scripts/perfil-diario.mjs` só **desenha** (README entre
`<!-- METAS:START -->` e `<!-- METAS:END -->`, barras em `assets/metas/<id>.svg` e `progresso.md`), chamado pelo
`scripts/rodar-diario.sh` e pelo workflow `perfil-diario.yml` (a cada push em `metas/**` ou `diario/**`).

```json
{
  "atualizado": "AAAA-MM-DD",
  "metas": [
    {
      "id": "java",
      "titulo": "Java",
      "icone": "☕",
      "cursos": [
        { "nome": "Java Spring Professional", "plataforma": "DevSuperior", "url": "https://devsuperior.club/courses/5", "percentual": 46, "atualizado": "2026-10-30" }
      ]
    }
  ]
}
```

| Campo | Obrigatório | O que é |
|---|---|---|
| `atualizado` | sim | dia da última atualização (aparece no rodapé) |
| `metas[].id`, `titulo` | sim | identificador curto (`java`, `aws`, `ia`) e texto exibido |
| `metas[].icone` | não | emoji do título (padrão: java ☕, aws ☁️, ia 🤖, outros 🎯) |
| `cursos[].nome`, `plataforma` | sim | nome do curso e onde é feito |
| `cursos[].url` | não | link do curso (`null` se não houver) |
| `cursos[].percentual` | sim | 0 a 100, ou `null` = “a atualizar” |
| `cursos[].atualizado` | não | dia em que o percentual foi lido (`AAAA-MM-DD`) |
| `cursos[].capitulos` | não | `[{ nome, feitas, total, opcional? }]`: mini-checklist sob o curso (✅ fechado, 🔄 em andamento, ⬜ não começado; `opcional: true` fica fora da conta de capítulos fechados) |

Meta sem curso mostra “📅 curso a definir”.
