#!/usr/bin/env node
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Récupération des arguments
const args = process.argv.slice(2);

if (args.length < 1) {
    console.error('Usage: node html2pdf <htmlPath> [-o <nomPdfSortie>]');
    process.exit(1);
}

const htmlPath = args[0];
let pdfName = 'CV_pdf.pdf'; // nom par défaut possibilité de le changer
const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'CV_pdf');

// Vérification de l’option -o
const oIndex = args.indexOf('-o');
if (oIndex !== -1 && args[oIndex + 1]) {
    pdfName = args[oIndex + 1].endsWith('.pdf') ? args[oIndex + 1] : args[oIndex + 1] + '.pdf';
}

const pdfPath = path.join(outputDir, pdfName);

async function htmlToPdfMax(htmlPath, pdfPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const dimensions = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        return {
            width: Math.max(body.scrollWidth, html.scrollWidth),
            height: Math.max(body.scrollHeight, html.scrollHeight)
        };
    });

    const A4_WIDTH_PT = 595;
    const A4_HEIGHT_PT = 842;
    const DPI = 96;
    const A4_WIDTH_PX = (A4_WIDTH_PT / 72) * DPI;
    const A4_HEIGHT_PX = (A4_HEIGHT_PT / 72) * DPI;

    const scale = Math.min(A4_WIDTH_PX / dimensions.width, A4_HEIGHT_PX / dimensions.height);

    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        scale: scale,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();
    console.log(`PDF généré : ${pdfPath}`);

    try {
        fs.unlinkSync(htmlPath);
        console.log('Fichier HTML supprimé');
    } catch (err) {
        console.error('Erreur suppression HTML :', err.message);
    }
}

// Création du dossier de sortie si inexistant
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

htmlToPdfMax(htmlPath, pdfPath);
