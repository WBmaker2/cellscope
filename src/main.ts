import './ui/styles/main.css';
import { App } from './app/App';

const root = document.querySelector<HTMLElement>('#app');
if (root) {
  const app = new App(root);
  app.start();
}
