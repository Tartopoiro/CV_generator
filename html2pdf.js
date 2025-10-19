const puppeteer = require('puppeteer');
const fs = require('fs');

async function htmlToPdfMax(htmlPath, pdfPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Charger le HTML
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Mesurer le contenu
    const dimensions = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const width = Math.max(body.scrollWidth, html.scrollWidth);
        const height = Math.max(body.scrollHeight, html.scrollHeight);
        return { width, height };
    });

    // Taille A4 en pixels à 96 DPI
    const A4_WIDTH = 595;   // points
    const A4_HEIGHT = 842;  // points

    // Calcul du scale pour maximiser la page
    const scale = Math.min(A4_WIDTH / dimensions.width, A4_HEIGHT / dimensions.height);

    // Générer le PDF
    await page.pdf({
        path: pdfPath,
        printBackground: true,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        scale: scale,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();
    console.log(`PDF généré et maximisé : ${pdfPath}`);
}


// Exemple d'utilisation
htmlToPdfMax('cv_data.html', 'cv_data.pdf');
