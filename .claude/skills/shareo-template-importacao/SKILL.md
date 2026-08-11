---
name: shareo-template-importacao
description: Atualizar o template de Importação PJ no Google Sheets (dropdowns de categoria/condição, formato de moeda, linhas de exemplo) e o CSV local equivalente. Usar quando alguém for editar, recriar ou auditar o template de importação em lote de anúncios PJ.
---

# Template de Importação PJ (Google Sheets)

ID do template: `1NEd7Dn-zASPcNwuwMWHTErJWSVgKl3ByinRWfGIjcQI`
URL de cópia para usuários: `https://docs.google.com/spreadsheets/d/{ID}/copy`

**Para atualizar o template original** (requer acesso de edição ao Google Sheets — não há credenciais de API no projeto, editar manualmente):

1. **Linhas de exemplo** — 2 linhas já inseridas (Furadeira/Ferramentas + Projetor/Eletrônicos)
2. **Dropdown `categoria`** (C2:C1000) → Dados → Validação → Lista:
   `Ferramentas,Eletrônicos,Construção,Esporte/Lazer,Festas,Eletrodomésticos`
3. **Dropdown `condicao`** (G2:G1000) → Dados → Validação → Lista:
   `NOVO,EXCELENTE,BOM,REGULAR`
4. **Moeda R$** (D2:F1000) → Formatar → Número → Personalizado: `R$ #.##0,00`

O template CSV local está em `public/template-importacao.csv` (6 linhas de exemplo, sem dropdowns).
Parser valida categoria case-insensitive e condição após `.toUpperCase()`.
