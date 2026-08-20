# FilmMaatjes skills

Elke skill krijgt een eigen submap met daarin een `SKILL.md`:

```
.claude/skills/
  mijn-skill-naam/
    SKILL.md
```

`SKILL.md` begint met frontmatter:

```markdown
---
name: mijn-skill-naam
description: Korte, specifieke omschrijving — wanneer Claude deze skill moet gebruiken.
---

Instructies voor de skill hier.
```

- `name`: kebab-case, zelfde als de mapnaam.
- `description`: bepaalt of Claude de skill relevant vindt, dus zo specifiek mogelijk.
- Aanroepen via `/mijn-skill-naam` of automatisch wanneer de beschrijving matcht.

Zet hier project-specifieke skills voor FilmMaatjes neer (bijv. rond de codeconventies
uit `CLAUDE.md`, testflows, of terugkerende taken).
