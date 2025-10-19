#!/usr/bin/env node

/**
 * CV Compiler - Génère des CV HTML à partir de données JSON
 * Usage: node compiler.js <fichier_config.json> [--output <nom_sortie>]
 */

const fs = require('fs');
const path = require('path');

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{name}} - Resume</title>
<style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Times New Roman', Times, serif;
        line-height: 1.4;
        color: #000;
        background-color: #fff;
        padding: 40px 60px;
        max-width: 850px;
        margin: 0 auto;
    }

    .header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
    }

    .header h1 {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .header h2 {
        font-size: 18px;
        font-weight: normal;
        margin: 8px 0;
        font-style: italic;
    }

    .contact-info {
        font-size: 12px;
        margin-top: 8px;
    }

    .section {
        margin-bottom: 20px;
    }

    .section-title {
        font-size: 16px;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 8px;
        border-bottom: 1px solid #000;
        padding-bottom: 2px;
        letter-spacing: 0.5px;
    }

    .summary {
        font-size: 13px;
        text-align: justify;
        line-height: 1.5;
    }

    .item {
        margin-bottom: 15px;
        font-size: 13px;
    }

    .item-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
    }

    .item-left {
        flex: 1;
    }

    .item-title {
        font-weight: bold;
        font-size: 13px;
    }

    .item-right {
        text-align: right;
        white-space: nowrap;
    }

    .item-description {
        margin-top: 3px;
        line-height: 1.4;
    }

    .item-description ul {
        margin-left: 18px;
        margin-top: 2px;
    }

    .item-description li {
        margin-bottom: 2px;
    }

    .skills-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        font-size: 13px;
    }

    .skill-category {
        margin-bottom: 8px;
    }

    .skill-category strong {
        display: block;
        margin-bottom: 2px;
    }

    @media print {
        body {
            padding: 20px;
            font-size: 13pt;
        }
        
        .section {
            page-break-inside: avoid;
        }
    }

    @media (max-width: 768px) {
        body {
            padding: 20px;
        }

        .skills-grid {
            grid-template-columns: 1fr;
        }

        .item-header {
            flex-direction: column;
        }

        .item-right {
            text-align: left;
            margin-top: 2px;
        }
    }
</style>
</head>
<body>
    <header class="header">
        <h1>{{name}}</h1>
        {{title_html}}
        <div class="contact-info">
            {{contact}}
        </div>
    </header>

    {{sections}}
</body>
</html>
`;

/**
 * Charge les données depuis un fichier YAML ou JSON
 */
function loadData(filepath) {
    if (!fs.existsSync(filepath)) {
        throw new Error(`Le fichier ${filepath} n'existe pas`);
    }

    const content = fs.readFileSync(filepath, 'utf8');
    const ext = path.extname(filepath).toLowerCase();

    if (ext === '.yaml' || ext === '.yml') {
        return yaml.load(content);
    } else if (ext === '.json') {
        return JSON.parse(content);
    } else {
        throw new Error("Format de fichier non supporté. Utilisez .yaml, .yml ou .json");
    }
}

/**
 * Rend la section Summary
 */
function renderSummary(data) {
    if (!data.summary) return '';

    return `
    <section class="section">
        <h2 class="section-title">Summary</h2>
        <p class="summary">
            ${data.summary}
        </p>
    </section>
    `;
}

/**
 * Rend la section Education
 */
function renderEducation(items) {
    if (!items || items.length === 0) return '';

    let html = '<section class="section">\n<h2 class="section-title">Education</h2>\n';

    items.forEach(item => {
        const institution = item.institution || '';
        const location = item.location || '';
        const period = item.period || '';
        const degree = item.degree || '';
        const option = item.option || '';
        const skills = item.skills || '';

        html += `
        <div class="item">
            <div class="item-header">
                <div class="item-left">
                    <div class="item-title">${institution}, ${location}</div>
                </div>
                <div class="item-right">
                    <div>${period}</div>
                </div>
            </div>
            <div class="item-description">
                <div><em>${degree}</em></div>
        `;

        if (option) {
            html += `<div>${option}</div>\n`;
        }
        if (skills) {
            html += `<div>Skills: ${skills}</div>\n`;
        }

        html += '</div>\n</div>\n';
    });

    html += '</section>\n';
    return html;
}

/**
 * Rend la section Work Experience
 */
function renderExperience(items) {
    if (!items || items.length === 0) return '';

    let html = '<section class="section">\n<h2 class="section-title">Work Experience</h2>\n';

    items.forEach(item => {
        const title = item.title || '';
        const company = item.company || '';
        const contractType = item.contract_type || '';
        const duration = item.duration || '';
        const location = item.location || '';
        const period = item.period || '';
        const achievements = item.achievements || [];

        // Construction du titre complet
        let fullTitle = title;
        if (company) {
            fullTitle += `, ${company}`;
        }
        if (contractType && duration) {
            fullTitle += ` - ${contractType}, ${duration}`;
        }

        html += `
        <div class="item">
            <div class="item-header">
                <div class="item-left">
                    <div class="item-title">${fullTitle}</div>
                </div>
                <div class="item-right">
                    <div class="item-location">${location}</div>
                    <div>${period}</div>
                </div>
            </div>
        `;

        if (achievements.length > 0) {
            html += '<div class="item-description">\n<ul>\n';
            achievements.forEach(achievement => {
                html += `<li>${achievement}</li>\n`;
            });
            html += '</ul>\n</div>\n';
        }

        html += '</div>\n';
    });

    html += '</section>\n';
    return html;
}

/**
 * Rend la section Skills
 */
function renderSkills(data) {
    if (!data.skills) return '';

    const skills = data.skills;
    const categories = Object.entries(skills);
    const mid = Math.ceil(categories.length / 2);
    const col1 = categories.slice(0, mid);
    const col2 = categories.slice(mid);

    let html = '<section class="section">\n<h2 class="section-title">Skills</h2>\n';
    html += '<div class="skills-grid">\n';

    // Colonne 1
    html += '<div>\n';
    col1.forEach(([category, items]) => {
        html += `<div class="skill-category">\n<strong>${category}</strong>\n`;
        if (typeof items === 'object' && !Array.isArray(items)) {
            Object.entries(items).forEach(([key, value]) => {
                html += `${key}: ${value}<br>\n`;
            });
        } else if (Array.isArray(items)) {
            html += items.join('<br>\n') + '<br>\n';
        } else {
            html += `${items}<br>\n`;
        }
        html += '</div>\n';
    });
    html += '</div>\n';

    // Colonne 2
    html += '<div>\n';
    col2.forEach(([category, items]) => {
        html += `<div class="skill-category">\n<strong>${category}</strong>\n`;
        if (typeof items === 'object' && !Array.isArray(items)) {
            Object.entries(items).forEach(([key, value]) => {
                html += `${key}: ${value}<br>\n`;
            });
        } else if (Array.isArray(items)) {
            html += items.join('<br>\n') + '<br>\n';
        } else {
            html += `${items}<br>\n`;
        }
        html += '</div>\n';
    });
    html += '</div>\n';

    html += '</div>\n</section>\n';
    return html;
}

/**
 * Compile les données en HTML
 */
function compileCV(data) {
    // Header
    const name = data.name || 'Your Name';

    // Title (optionnel)
    let titleHtml = '';
    if (data.title) {
        titleHtml = `<h2>${data.title}</h2>`;
    }

    const contactParts = [];
    if (data.location) contactParts.push(data.location);
    if (data.phone) contactParts.push(data.phone);
    if (data.email) contactParts.push(data.email);
    const contact = contactParts.join(' • ');

    // Sections
    let sections = '';
    sections += renderSummary(data);
    sections += renderEducation(data.education || []);
    sections += renderExperience(data.experience || []);
    sections += renderSkills(data);

    // Génération finale
    let html = HTML_TEMPLATE;
    html = html.replace(/\{\{name\}\}/g, name);
    html = html.replace(/\{\{title_html\}\}/g, titleHtml);
    html = html.replace(/\{\{contact\}\}/g, contact);
    html = html.replace(/\{\{sections\}\}/g, sections);

    return html;
}

/**
 * Parse les arguments de la ligne de commande
 */
function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error('Usage: node compiler.js <fichier_config> [--output <nom_sortie>]');
        process.exit(1);
    }

    const config = {
        inputFile: args[0],
        outputName: null
    };

    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--output' || args[i] === '-o') {
            config.outputName = args[i + 1];
            i++;
        }
    }

    return config;
}

/**
 * Main
 */
function main() {
    try {
        const config = parseArgs();

        // Charger les données
        console.log(`Chargement de ${config.inputFile}...`);
        const data = loadData(config.inputFile);

        // Compiler
        console.log('Compilation du CV...');
        const html = compileCV(data);

        // Déterminer le nom de sortie
        let outputName;
        if (config.outputName) {
            outputName = config.outputName;
        } else {
            const baseName = path.basename(config.inputFile, path.extname(config.inputFile));
            outputName = baseName;
        }

        const outputFile = `cv_${outputName}.html`;

        // Écrire le fichier
        fs.writeFileSync(outputFile, html, 'utf8');

        if (fs.existsSync(config.inputFile)) {
            fs.unlinkSync(config.inputFile);
            console.log(`✓ Fichier de configuration supprimé : ${config.inputFile}`);
        }

        console.log(`✓ CV généré avec succès : ${outputFile}`);
    } catch (error) {
        console.error(`Erreur : ${error.message}`);
        process.exit(1);
    }
}

// Si le module est exécuté directement
if (require.main === module) {
    main();
}

module.exports = { loadData, compileCV };