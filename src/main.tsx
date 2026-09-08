import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root')!);

const renderApp = async () => {
  let RootPage = App;

  // The manual story-delivery interface is intentionally excluded from public
  // production builds. It remains available through the local development server.
  if (import.meta.env.DEV && window.location.pathname === '/admin/send-story') {
    RootPage = (await import('./AdminSendStory.tsx')).default;
  }

  root.render(
    <StrictMode>
      <RootPage />
    </StrictMode>,
  );
};

void renderApp();
