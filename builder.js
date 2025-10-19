#!/usr/bin/env node

/**
 * CV Builder - Assemble des éléments atomiques JSON en un config.json
 * Usage: node builder.js <build_config.json> [--output <nom_sortie>]
 */

const fs = require('fs');
const path = require('path');

/**
 * Charge un fichier JSON
 */
function loadJSON(filepath) {
    if (!fs.existsSync(filepath)) {
        throw new Error(`Le fichier ${filepath} n'existe pas`);
    }
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
}

/**
 * Résout le chemin relatif depuis le dossier de la build config
 */
function resolvePath(basePath, relativePath) {
    return path.join(basePath, relativePath);
}

/**
 * Charge un élément atomique
 */
function loadElement(basePath, elementPath) {
    const fullPath = resolvePath(basePath, elementPath);
    return loadJSON(fullPath);
}

/**
 * Construit le config.json depuis les éléments atomiques
 */
function buildConfig(buildConfigPath) {
    const buildConfig = loadJSON(buildConfigPath);
    const basePath = path.dirname(buildConfigPath);
    
    const config = {};
    
    // Header
    if (buildConfig.header) {
        const header = loadElement(basePath, buildConfig.header);
        config.name = header.name;
        config.location = header.location;
        config.phone = header.phone;
        config.email = header.email;
    }
    
    // Title
    if (buildConfig.title) {
        const title = loadElement(basePath, buildConfig.title);
        config.title = title.title;
    }
    
    // Summary
    if (buildConfig.summary) {
        const summary = loadElement(basePath, buildConfig.summary);
        config.summary = summary.summary;
    }
    
    // Education
    if (buildConfig.education && Array.isArray(buildConfig.education)) {
        config.education = buildConfig.education.map(eduPath => {
            return loadElement(basePath, eduPath);
        });
    }
    
    // Experience
    if (buildConfig.experience && Array.isArray(buildConfig.experience)) {
        config.experience = buildConfig.experience.map(expPath => {
            return loadElement(basePath, expPath);
        });
    }
    
    // Skills
    if (buildConfig.skills && Array.isArray(buildConfig.skills)) {
        config.skills = {};
        buildConfig.skills.forEach(skillPath => {
            const skill = loadElement(basePath, skillPath);
            // Merge skill object into config.skills
            Object.assign(config.skills, skill);
        });
    }
    
    return config;
}

/**
 * Parse les arguments de la ligne de commande
 */
function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error('Usage: node builder.js <build_config.json> [--output <nom_sortie>]');
        console.error('');
        console.error('Exemple:');
        console.error('  node builder.js builds/finance.json');
        console.error('  node builder.js builds/finance.json --output config_finance');
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
        const config = parseArgs();
        
        console.log(`📦 Chargement de ${config.buildFile}...`);
        const cvConfig = buildConfig(config.buildFile);
        
        const outputFile = `${config.outputName}.json`;
        
        console.log('🔨 Construction du config...');
        fs.writeFileSync(outputFile, JSON.stringify(cvConfig, null, 2), 'utf8');
        
        console.log(`✓ Config généré avec succès : ${outputFile}`);
        console.log('');
        console.log('Pour compiler le CV, exécutez :');
        console.log(`  node compiler.js ${outputFile}`);
    } catch (error) {
        console.error(`❌ Erreur : ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { buildConfig };