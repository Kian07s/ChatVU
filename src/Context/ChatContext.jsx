import { createContext, useEffect, useState, useContext } from "react";
import { baseUrl, getRequest, patchRequest } from "../utils/services.js";
import { AuthContext } from "./AuthContext.jsx";
import { io } from "socket.io-client";

//Initialize the socket OUTSIDE the component so it doesn't 
// re-connect every time the component re-renders.
const socket = io("http://localhost:5050");

export const ChatContext = createContext();

export const ChatContextProvider = ({ children }) => {
    //chat state
    const { user } = useContext(AuthContext);
    const [userChats, setUserChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [isUserChatsLoading, setIsUserChatsLoading] = useState(false);
    const [userChatsError, setUserChatsError] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]); // tracking online users
    const [socketConnected, setSocketConnected] = useState(false);
    const [messages, setMessages] = useState([]); // Add a state for the incoming socket message
    const [typingUsers, setTypingUsers] = useState({});
    const [notifications, setNotifications] = useState([]); //state for notifications

    useEffect(() => {
        // Listen for the connection event
        socket.on("connect", () => {
            console.log("Connected to Socket Server. ID:", socket.id);
            if (user?._id) {
                socket.emit("addNewUser", user._id);
                setSocketConnected(true);
            }
        });

        if (!socket) {
            return;
        }

        const handleGetMessage = (res) => {
            // If the message belongs to the chat user is currently looking at
            setMessages((prev) => {
                return (selectedChat && selectedChat._id === res.chatId) ? [...prev, res] : prev;
            });

            if (res.senderId === user?._id) return;

            // Otherwise, add to notifications
            const isChatActive = selectedChat && selectedChat._id === res.chatId;

            if (!isChatActive) {
                setNotifications((prev) => {
                    // Prevent duplicate notifications for the same message
                    const isDuplicate = prev.some(n => n?._id === res._id);
                    if (isDuplicate) return prev;
                    return [{...res, chatId: res.chatId}, ...prev];
                });
            }

            setUserChats((prev) => {
                const chatIndex = prev.findIndex(c => c._id === res.chatId);
                if (chatIndex === -1) {
                    return prev;
                }

                // Create the updated chat object
                const updatedChat = {
                    ...prev[chatIndex], 
                    lastMessage: res, 
                    updatedAt: new Date().toISOString() // Force new timestamp for sorting
                };

                const otherChats = prev.filter(c => c._id !== res.chatId);

                console.log("Socket received:", res.chatId, selectedChat?._id);

            // Return new array with updated chat at index 0
            return [updatedChat, ...otherChats];
            })
        }

        // Listen for the server's reply
        socket.on("getMessage", handleGetMessage);

        // Cleanup function: good practice to close listeners
        return () => {
            socket.off("connect")
            socket.off("getMessage", handleGetMessage);
        };
    }, [socket, user, selectedChat]); 

    // Clear notifications when opening a chat
    useEffect(() => {
        if (selectedChat?._id) {
            setNotifications(prev => prev.filter(n => n && n.chatId !== selectedChat._id));
        }
    }, [selectedChat?._id]);

    useEffect(() => {
        if (user?._id && socket) {
            socket.emit("addNewUser", user._id);

            //Listen for the list from the server
            socket.on("getOnlineUsers", (res) => {
                setOnlineUsers(res);
            });
        }

        return() => {
            socket.off("getOnlineUsers");
        };
    }, [user, socket]);

    // Idle logic
    useEffect(() => {
        if (!user?._id) return;

        let timer;
        const resetTimer = () => {
            clearTimeout(timer);
            socket.emit("statusUpdate", { userId: user._id, status: "online" });
            timer = setTimeout(() => {
                socket.emit("statusUpdate", { userId: user._id, status: "idle" });
            }, 300000); // 5 mins
        };
    window.addEventListener("mousemove", resetTimer);
    return () => window.removeEventListener("mousemove", resetTimer);
}, [user]);

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

    const updateTypingUsers = (chatId, senderName, isTyping) => {
        setTypingUsers(prev => {
            const current = prev[chatId] || [];
            if (isTyping) {
                if (!current.includes(senderName)) {
                    return { ...prev, [chatId]: [...current, senderName] };
                }
            } else {
                return { ...prev, [chatId]: current.filter(name => name !== senderName) };
            }
            return prev;
        });
    };

    //for immediate chat updates
    const addChat = (chat) => {
        setUserChats(prev => [...prev, chat]);
    };

    return (
        <ChatContext.Provider value={{
            userChats,
            socket,
            selectedChat,
            setSelectedChat,
            onlineUsers,
            isUserChatsLoading,
            userChatsError,
            messages,     
            setMessages,   
            notifications,
            setNotifications,
            addChat,
            setUserChats,
            typingUsers,
            setTypingUsers,
            updateTypingUsers,
        }}
        >{children}</ChatContext.Provider>

    );
};
