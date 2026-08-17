import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminSendStory from './AdminSendStory.tsx';
import './index.css';

const RootPage = window.location.pathname === '/admin/send-story' ? AdminSendStory : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootPage />
  </StrictMode>,
);
