import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './client/index.css'
import { BrowserRouter} from 'react-router-dom';
import { AuthContextProvider } from './Context/AuthContext';

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthContextProvider>
        <App /> 
      </AuthContextProvider>
    </BrowserRouter>
  </StrictMode>,
)
 