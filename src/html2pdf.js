#!/usr/bin/env node
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// --- CLI args ---
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node html2pdf <htmlPath> [-o <nomPdfSortie>]');
    process.exit(1);
}

const htmlPath = args[0];
let pdfName = 'CV_pdf.pdf';
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'CV_pdf');

// Option -o
const oIndex = args.indexOf('-o');
if (oIndex !== -1 && args[oIndex + 1]) {
    pdfName = args[oIndex + 1].endsWith('.pdf') ? args[oIndex + 1] : args[oIndex + 1] + '.pdf';
}

const pdfPath = path.join(outputDir, pdfName);

// --- MAIN ---
async function htmlToPdfMax(htmlPath, pdfPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // --- ✅ Mesure fiable du contenu réel ---
    const dimensions = await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;

        // Sauvegarde des styles d'origine
        const originalMargin = body.style.margin;
        const originalWidth = body.style.width;

        // Neutralise les marges et centrages artificiels
        body.style.margin = '0';
        body.style.width = '100%';

        const contentWidth = Math.max(
            body.scrollWidth,
            html.scrollWidth,
            body.offsetWidth,
            html.offsetWidth
        );
        const contentHeight = Math.max(
            body.scrollHeight,
            html.scrollHeight,
            body.offsetHeight,
            html.offsetHeight
        );

        // Restaure les styles d'origine
        body.style.margin = originalMargin;
        body.style.width = originalWidth;

        return { width: contentWidth, height: contentHeight };
    });

    console.log(`📏 Dimensions du contenu : ${dimensions.width}px x ${dimensions.height}px`);

    // --- Paramètres A4 ---
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const MARGIN_MM = 10; 
    const PX_TO_MM = 0.264583; // Conversion px → mm

    // Hauteur imprimable
    const printableHeight = A4_HEIGHT_MM - (2 * MARGIN_MM);

    // --- Calcul du scale (pour que la hauteur tienne sur une page) ---
    const contentHeightMM = dimensions.height * PX_TO_MM;
    const scale = Math.min(printableHeight / contentHeightMM, 1); // jamais > 1

    console.log(`🔍 Échelle appliquée : ${scale.toFixed(3)}`);

    // --- Génération du PDF ---
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        scale: scale,
        margin: {
            top: `${MARGIN_MM}mm`,
            bottom: `${MARGIN_MM}mm`,
            left: `${MARGIN_MM}mm`,
            right: `${MARGIN_MM}mm`
        }
    });

    await browser.close();
    console.log(`✅ PDF généré : ${pdfPath}`);

    // --- Nettoyage optionnel ---
    try {
        fs.unlinkSync(htmlPath);
        console.log('🧹 Fichier HTML supprimé');
    } catch (err) {
        console.error('Erreur suppression HTML :', err.message);
    }
}

// --- Création dossier de sortie ---
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

htmlToPdfMax(htmlPath, pdfPath);
