import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// ensure the AudioEngine only initializes once
root.render(
    <App />
);
