#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Racine du projet = dossier du script
const projectRoot = path.resolve(__dirname, '..');


/**
 * Charge un fichier JSON
 */
function loadJSON(filepath) {
    if (!fs.existsSync(filepath)) {
        throw new Error(`Le fichier ${filepath} n'existe pas`);
    }
    if (fs.lstatSync(filepath).isDirectory()) {
        throw new Error(`${filepath} est un dossier, pas un fichier JSON`);
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/**
 * Résout un chemin par rapport à la racine du projet
 */
function resolvePath(elementPath) {
    // Si le chemin est déjà absolu, on ne touche pas
    if (path.isAbsolute(elementPath)) return elementPath;
    return path.join(projectRoot, elementPath);
}

/**
 * Charge un élément atomique
 */
function loadElement(elementPath) {
    const fullPath = resolvePath(elementPath);
    return loadJSON(fullPath);
}

/**
 * Construit le config.json
 */
function buildConfig(buildConfigPath) {
    const buildConfig = loadJSON(resolvePath(buildConfigPath));

    const config = {};

    if (buildConfig.header) {
        const header = loadElement(buildConfig.header);
        config.name = header.name;
        config.location = header.location;
        config.phone = header.phone;
        config.email = header.email;
    }

    if (buildConfig.title) {
        config.title = loadElement(buildConfig.title).title;
    }

    if (buildConfig.summary) {
        config.summary = loadElement(buildConfig.summary).summary;
    }

    if (buildConfig.education && Array.isArray(buildConfig.education)) {
        config.education = buildConfig.education.map(loadElement);
    }

    if (buildConfig.experience && Array.isArray(buildConfig.experience)) {
        config.experience = buildConfig.experience.map(loadElement);
    }

    if (buildConfig.skills && Array.isArray(buildConfig.skills)) {
        config.skills = {};
        buildConfig.skills.forEach(skillPath => {
            Object.assign(config.skills, loadElement(skillPath));
        });
    }

    return config;
}

/**
 * Parse arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: node builder.js <build_config.json> [--output <nom_sortie>]');
        process.exit(1);
    }

    const config = {
        buildFile: args[0],
        outputName: 'config'
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
        const { buildFile, outputName } = parseArgs();
        
        console.log(`📦 Chargement de ${buildFile}...`);
        const cvConfig = buildConfig(buildFile);

        const outputFile = `${outputName}.json`;
        fs.writeFileSync(outputFile, JSON.stringify(cvConfig, null, 2), 'utf8');

        console.log(`✓ Config généré avec succès : ${outputFile}`);
        console.log(`Pour compiler le CV : node compiler.js ${outputFile}`);
    } catch (err) {
        console.error(`❌ Erreur : ${err.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { buildConfig };
