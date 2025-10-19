#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Récupération des arguments
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node cv_generator.js <build.json> -o <nomCV>');
    process.exit(1);
}

const buildJson = args[0];
const oIndex = args.indexOf('-o');
if (oIndex === -1 || !args[oIndex + 1]) {
    console.error('Vous devez préciser -o <nomCV>');
    process.exit(1);
}
const cvName = args[oIndex + 1];

// Chemin vers le dossier contenant les scripts
const srcDir = path.join(__dirname, 'src');

// Vérification que les scripts existent
['builder.js', 'compiler.js', 'html2pdf.js'].forEach(script => {
    if (!fs.existsSync(path.join(srcDir, script))) {
        console.error(`Le script ${script} est introuvable dans src/`);
        process.exit(1);
    }
});

// Fonction pour lancer un script Node et attendre sa fin
function runScript(script, scriptArgs) {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [path.join(srcDir, script), ...scriptArgs], { stdio: 'inherit' });
        proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`${script} a échoué avec code ${code}`));
        });
    });
}

// Workflow complet
(async () => {
    try {
        console.log('--- Étape 1 : Builder ---');
        await runScript('builder.js', [buildJson, '-o', 'config']);

        console.log('--- Étape 2 : Compiler ---');
        await runScript('compiler.js', ['config.json', '-o', cvName]);

        console.log('--- Étape 3 : HTML -> PDF ---');
        const htmlFile = `cv_${cvName}.html`;
        await runScript('html2pdf.js', [htmlFile, '-o', cvName]);

        console.log('🎉 Processus terminé, PDF généré avec succès !');
    } catch (err) {
        console.error('Erreur durant le processus :', err.message);
        process.exit(1);
    }
})();
