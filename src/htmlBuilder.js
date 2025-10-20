#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const { loadCvData } = require('./dataLoader');

const projectRoot = path.resolve(__dirname, '..');
const templatesDir = path.join(projectRoot, 'style_and_templates');
const outputDir = path.join(projectRoot, 'CV_html');

const TEMPLATE_MAIN = path.join(templatesDir, 'main_template.html');
const TEMPLATE_EDUCATION = path.join(templatesDir, 'education_item.html');
const TEMPLATE_EXPERIENCE = path.join(templatesDir, 'experience_item.html');
const TEMPLATE_ACHIEVEMENT = path.join(templatesDir, 'achievement_item.html');
const TEMPLATE_SKILL = path.join(templatesDir, 'skill_item.html');
const STYLE_CSS = path.join(templatesDir, 'style.css');


async function loadFile(filePath) {
    return fs.readFile(filePath, 'utf-8');
}

async function buildSection(templatePath, instances) {
    const template = await loadFile(templatePath);
    let html = '';

    for (const instance of instances) {
        const className = instance.constructor.name.toLowerCase();
        let tplCopy = template;

        for (const key of Object.keys(instance)) {
            let value = instance[key];

            if (Array.isArray(value)) {
                value = value.join('<br>');
            } else if (typeof value === 'string') {
                value = value.replace(/\n/g, '<br>');
            }
            const placeholder = new RegExp(`{{${className}\\.${key}}}`, 'g');
            tplCopy = tplCopy.replace(placeholder, value ?? '');
        }
        html += tplCopy + '\n';
    }

    return html;
}


async function generateHtml(configPath, outputFile = 'cv.html') {
    const cvData = await loadCvData(configPath);

    let mainTemplate = await loadFile(TEMPLATE_MAIN);
    const styleCss = await loadFile(STYLE_CSS);

    const educationHtml = await buildSection(TEMPLATE_EDUCATION, cvData.education);
    const experienceHtml = await buildSection(TEMPLATE_EXPERIENCE, cvData.experience);
    const achievementHtml = await buildSection(TEMPLATE_ACHIEVEMENT, cvData.personnal_achievements);
    const skillsHtml = await buildSection(TEMPLATE_SKILL, cvData.skills);

    mainTemplate = mainTemplate
        .replace('{{styles}}', styleCss)
        .replace('{{header.name}}', cvData.header.name)
        .replace('{{header.location}}', cvData.header.location)
        .replace('{{header.phone}}', cvData.header.phone)
        .replace('{{header.email}}', cvData.header.email)
        .replace('{{header.linkedin}}', cvData.header.linkedin 
            ? ` • <a href="${cvData.header.linkedin}" target="_blank">LinkedIn</a>` 
            : '')
        .replace('{{header.github}}', cvData.header.github 
            ? ` • <a href="${cvData.header.github}" target="_blank">GitHub</a>` 
            : '')
        .replace('{{title.title}}', cvData.title.title)
        .replace('{{summary.summary}}', cvData.summary.summary)
        .replace('{{education_items}}', educationHtml)
        .replace('{{experience_items}}', experienceHtml)
        .replace('{{personnal_achievements}}', achievementHtml)
        .replace('{{skills_items}}', skillsHtml);

    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, outputFile);
    await fs.writeFile(outputPath, mainTemplate, 'utf-8');

    console.log(`HTML généré : ${outputPath}`);
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: node htmlBuilder.js <config.json> [output.html]');
        process.exit(1);
    }
    const configPath = args[0];
    const outputFile = args[1] || 'cv.html';
    await generateHtml(configPath, outputFile);
}

if (require.main === module) main();

module.exports = { generateHtml };
