const puppeteer = require('puppeteer');
const fs = require('fs');

async function htmlToPdfMax(htmlPath, pdfPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Taille du contenu en pixels
    const dimensions = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        return {
            width: Math.max(body.scrollWidth, html.scrollWidth),
            height: Math.max(body.scrollHeight, html.scrollHeight)
        };
    });

    // Taille A4 en points -> pixels (1pt = 1/72 inch, 96dpi)
    const A4_WIDTH_PT = 595; // points
    const A4_HEIGHT_PT = 842; // points
    const DPI = 96;
    const A4_WIDTH_PX = (A4_WIDTH_PT / 72) * DPI;
    const A4_HEIGHT_PX = (A4_HEIGHT_PT / 72) * DPI;

    // Calcul du scale pour maximiser l'occupation
    const scale = Math.min(A4_WIDTH_PX / dimensions.width, A4_HEIGHT_PX / dimensions.height);

    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        scale: scale,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();
    console.log(`PDF maximisé : ${pdfPath}`);
}

htmlToPdfMax('cv_config.html', 'cv.pdf');
