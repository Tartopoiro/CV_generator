
## Format des fichiers atomiques

### Header (`atoms/header/benjamin_basset.json`)
```json
{
  "name": "Benjamin Basset",
  "location": "Bordeaux, France",
  "phone": "(+33) 7 69 91 99 97",
  "email": "bbasset.benjamin@gmail.com"
}
```

### Title (`atoms/titles/finance.json`)
```json
{
  "title": "Finance Professional seeking Quantitative Analyst Position"
}
```

### Summary (`atoms/summaries/finance.json`)
```json
{
  "summary": "Started studies in 2021 after three years working in a bank..."
}
```

### Education Item (`atoms/education/enseirb.json`)
```json
{
  "institution": "Bordeaux Institute of Technology (ENSEIRB-MATMECA)",
  "location": "Bordeaux, France",
  "period": "Until 2027",
  "degree": "5-year degree in Computer Science",
  "skills": "Information system, statistics, software development, system architecture"
}
```

### Experience Item (`atoms/experience/credit_agricole.json`)
```json
{
  "title": "Accounting controller",
  "company": "Crédit Agricole",
  "contract_type": "temporary contract",
  "duration": "3 months",
  "location": "Vesoul, France",
  "period": "2021",
  "achievements": [
    "Created a VBA based tool for finding double payment",
    "Created a new process and somes automatizations for risky invoices controls",
    "Practiced skills: Data engineering, VBA, communication, project management, finance"
  ]
}
```

### Skill Category (`atoms/skills/computer_science.json`)
```json
{
  "Computer Science": {
    "Database": "SQL, Postgres, Oracle PL/SQL",
    "Software Eng.": "Java SE/EE, JS, C, UML",
    "Data": "VBA, Python"
  }
}
```

## Configuration de build

### Fichier de build (`builds/finance.json`)
```json
{
  "header": "atoms/header/benjamin_basset.json",
  "title": "atoms/titles/finance.json",
  "summary": "atoms/summaries/finance.json",
  "education": [
    "atoms/education/germaine_tillion.json",
    "atoms/education/paul_sabatier.json",
    "atoms/education/enseirb.json"
  ],
  "experience": [
    "atoms/experience/credit_mutuel.json",
    "atoms/experience/credit_agricole.json",
    "atoms/experience/act_justly.json"
  ],
  "skills": [
    "atoms/skills/computer_science.json",
    "atoms/skills/languages.json",
    "atoms/skills/mathematics.json",
    "atoms/skills/soft_skills.json"
  ]
}
```

### Fichier de build Data Science (`builds/data_science.json`)
```json
{
  "header": "atoms/header/benjamin_basset.json",
  "title": "atoms/titles/data_science.json",
  "summary": "atoms/summaries/data_science.json",
  "education": [
    "atoms/education/enseirb.json",
    "atoms/education/paul_sabatier.json"
  ],
  "experience": [
    "atoms/experience/act_justly.json",
    "atoms/experience/cnrs.json",
    "atoms/experience/credit_agricole.json"
  ],
  "skills": [
    "atoms/skills/computer_science.json",
    "atoms/skills/mathematics.json",
    "atoms/skills/languages.json",
    "atoms/skills/soft_skills.json"
  ]
}
```
## Worflow (standard)

### 1. Créer les éléments atomiques
Créez vos fichiers JSON dans le dossier `atoms/`

### 2. Créer une configuration de build
```bash
# Créer builds/finance.json avec les chemins des éléments voulus
```

### 3. Utiliser
```bash
node cv_generator.js builds/build.json -o monCV
# Génère: monCV.pdf dans le dossier CV_pdf
```

## Workflow (avancée)

### 1. Créer les éléments atomiques
Créez vos fichiers JSON dans le dossier `atoms/`

### 2. Créer une configuration de build
```bash
# Créer builds/finance.json avec les chemins des éléments voulus
```

### 3. Builder le config
```bash
node src/builder.js builds/finance.json -o config
# Génère: config.json
```

### 4. Compiler le CV
```bash
node src/compiler.js config.json -o finance
# Génère: cv_finance.html et supprime le json d'entrée
```

### 5. Transformer le html en pdf 
```bash
node src/html2pdf cv_config.html -o monCV
#Génere: monCV.pdf dans le dossier CV_pdf et supprime le html
```
