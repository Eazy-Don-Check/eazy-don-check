import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientRoot = path.resolve(__dirname, '..');
const backgroundsDir = path.join(clientRoot, 'public', 'backgrounds');
const manifestPath = path.join(backgroundsDir, 'manifest.json');

const supportedExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

const ensureDirectory = () => {
  fs.mkdirSync(backgroundsDir, { recursive: true });
};

const toPublicPath = (filename) =>
  `/backgrounds/${encodeURIComponent(filename)}`;

const getImages = () => {
  if (!fs.existsSync(backgroundsDir)) {
    return [];
  }

  return fs
    .readdirSync(backgroundsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((filename) =>
      supportedExtensions.has(
        path.extname(filename).toLowerCase()
      )
    )
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
};

const buildManifest = (filenames) => {
  const manifest = {
    home: [],
    login: [],
    signup: [],
  };

  for (const filename of filenames) {
    const lower = filename.toLowerCase();
    const publicPath = toPublicPath(filename);

    if (lower.startsWith('home-')) {
      manifest.home.push(publicPath);
    } else if (lower.startsWith('login-')) {
      manifest.login.push(publicPath);
    } else if (lower.startsWith('signup-')) {
      manifest.signup.push(publicPath);
    }
  }

  return manifest;
};

ensureDirectory();

const filenames = getImages();
const manifest = buildManifest(filenames);

fs.writeFileSync(
  manifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);

console.log(
  `Background manifest generated: ${manifestPath}`
);
console.log(
  `Home: ${manifest.home.length}, Login: ${manifest.login.length}, Signup: ${manifest.signup.length}`
);