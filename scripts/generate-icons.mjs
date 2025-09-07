import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const ROOT = process.cwd();
const INPUT = path.join(ROOT, 'main.png');
const OUT_PNG_DIR = path.join(ROOT, 'assets', 'icons', 'png');
const OUT_WIN_DIR = path.join(ROOT, 'assets', 'icons', 'win');

const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function ensureDirs() {
    fs.mkdirSync(OUT_PNG_DIR, { recursive: true });
    fs.mkdirSync(OUT_WIN_DIR, { recursive: true });
}

async function generatePngs() {
    const outFiles = [];
    for (const size of SIZES) {
        const out = path.join(OUT_PNG_DIR, `${size}.png`);
        await sharp(INPUT)
            .resize(size, size, { fit: 'contain' })
            .png({ compressionLevel: 9 })
            .toFile(out);
        outFiles.push(out);
    }
    return outFiles;
}

async function generateIco(pngFiles) {
    const buf = await pngToIco(pngFiles);
    const icoPath = path.join(OUT_WIN_DIR, 'app.ico');
    fs.writeFileSync(icoPath, buf);
    return icoPath;
}

async function main() {
    if (!fs.existsSync(INPUT)) {
        console.error('main.png이 루트에 없습니다. 추가 후 다시 실행하세요.');
        process.exit(1);
    }
    await ensureDirs();
    const pngs = await generatePngs();
    const ico = await generateIco(pngs);
    console.log('아이콘 생성 완료');
    console.log('PNG:', OUT_PNG_DIR);
    console.log('ICO:', ico);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});


