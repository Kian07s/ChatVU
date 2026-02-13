import { createContext, useEffect, useState, useContext } from "react";
import { baseUrl, getRequest } from "../utils/services.js";
import { AuthContext } from "./AuthContext.jsx";

export const ChatContext = createContext();

export const ChatContextProvider = ({ children }) => {
    //chat state
    const { user } = useContext(AuthContext);
    const [userChats, setUserChats] = useState([]);
    const [isUserChatsLoading, setIsUserChatsLoading] = useState(false);
    const [userChatsError, setUserChatsError] = useState(null);

    //get userChats whenever the user changes
    useEffect(() => {
        const getUserChats = async() => {
            //if the user exists, get their messages
            if (!user?._id) {
                return;
            }
                
            setIsUserChatsLoading(true);
            setUserChatsError(null);

            try {
                const response = await getRequest(`${baseUrl}/chats/user/${user?._id}`);
                setIsUserChatsLoading(false);

                //check for error
                if (response?.error) {
                    setUserChatsError(response);
                    setUserChats([]);
                    return;
                }

                //if successfull, show chats
                if (Array.isArray(response)) {
                    setUserChats(response);
                } else {
                    setUserChats([]);
                }
            } catch (error) {
                setIsUserChatsLoading(false);
                setUserChatsError(error);
                setUserChats([]);
            }
        };

        getUserChats();
    }, [user])

    //for immediate chat updates
    const addChat = (chat) => {
        setUserChats(prev => [...prev, chat]);
    };

    return (
        <ChatContext.Provider value={{
            userChats,
            isUserChatsLoading,
            userChatsError,
            addChat,
            setUserChats
        }}
        >{children}</ChatContext.Provider>

    );
};
