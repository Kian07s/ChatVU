import React, { useContext } from 'react';
import { Toaster } from 'react-hot-toast';
import {Routes, Route, Navigate} from 'react-router-dom';
import Chat from './client/pages/Chat';
import Register from './client/pages/Register';
import Login from './client/pages/Login';
import NavBar from './client/components/NavBar';
import './client/App.css'
import { AuthContext } from './Context/AuthContext';
import { ChatContextProvider } from "./Context/ChatContext.jsx";

function App() {
  const {user} = useContext(AuthContext);
  return (
    //set user to be able to use id for chats
    <ChatContextProvider>
      <Toaster position="top-center" reverseOrder={false} /> {/* to implement toaster for better UI */}
      <div>
        <NavBar/>
        <div>
          <Routes>
            <Route path="/" element={user ? <Chat /> : <Login/>} />
            <Route path="/register" element={user ? <Chat /> : <Register/>} />
            <Route path="/login" element={user ? <Chat /> : <Login/>} />
            <Route path="/*" element={<Navigate to="/"/>} />
          </Routes>
        </div>
      </div>
    </ChatContextProvider>
  )
}

export default App
