import { hydrateRoot } from 'react-dom/client';
import { App } from './App';
import type { PageData } from './types';
import './styles.css';

const dataElement = document.getElementById('page-data');
if (!dataElement) throw new Error('Page data is missing. Run npm run build before previewing the website.');
const data: PageData = JSON.parse(dataElement.textContent ?? '');
const root = document.getElementById('root');
if (!root) throw new Error('Application root missing');
hydrateRoot(root, <App data={data} />);
