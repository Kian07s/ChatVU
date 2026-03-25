import { createContext, useEffect, useState, useContext, useRef } from "react";
import { baseUrl, getRequest, patchRequest } from "../utils/services.js";
import { AuthContext } from "./AuthContext.jsx";
import { io } from "socket.io-client";
import messageReceive from "../assets/messageReceive.mp3";

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
    const receiveSound = useRef(new Audio(messageReceive));  //receive message sound effect
    const selectedChatRef = useRef(selectedChat);

    useEffect(() => {
        receiveSound.current.volume = 1;
    }, []);

    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

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
            const currentSelectedChat = selectedChatRef.current;

            // If the message belongs to the chat user is currently looking at
            setMessages((prev) => {
                return (currentSelectedChat && currentSelectedChat._id === res.chatId) ? [...prev, res] : prev;
            });

            if (res.senderId === user?._id) return;

            // Otherwise, add to notifications
            const isChatActive = currentSelectedChat &&  currentSelectedChat._id === res.chatId;

            if (!isChatActive) {
                setNotifications((prev) => {
                    // Prevent duplicate notifications for the same message
                    const existingNotifIndex = prev.findIndex(n => n?.chatId === res.chatId);
                    if (existingNotifIndex !== -1) {
                        // Increment existing count
                        const updatedNotifs = [...prev];
                        updatedNotifs[existingNotifIndex] = {
                            ...updatedNotifs[existingNotifIndex],
                            count: (updatedNotifs[existingNotifIndex].count || 1) + 1
                        };
                        return updatedNotifs;
                    }
                    // Add new notification object
                    return [{ chatId: res.chatId, count: 1, ...res }, ...prev];
                });

                if (receiveSound.current) {
                    receiveSound.current.currentTime = 0;
                    receiveSound.current.play().catch(() => {});
                }
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


        socket.on("messagesSeenUpdate", ({ chatId, userId, messageId }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === messageId && !m.seenBy.includes(userId)) {
                    return { ...m, seenBy: [...m.seenBy, userId] };
                }
                return m;
            }));
        });

        // Cleanup function: good practice to close listeners
        return () => {
            socket.off("connect")
            socket.off("getMessage", handleGetMessage);
            socket.off("messagesSeenUpdate");
        };
    }, [socket, user]); 

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
        //if the user doesn't exist, return
        if (!user?._id) {
            return;
        }
        const getUserChats = async() => {    
            setIsUserChatsLoading(true);

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

                    //fetch unread message count
                    const unreadRes = await getRequest(`${baseUrl}/messages/unread/${user._id}`);
                    if (Array.isArray(unreadRes)) {
                        const newNotifications = unreadRes.map(item => ({
                            chatId: item._id,
                            count: item.count,
                            isNew: false
                        }));

                        setNotifications(newNotifications);
                    }
                } else {
                    setUserChats([]);
                }
            } catch (error) {
                setIsUserChatsLoading(false);
                setUserChatsError(error);
                setUserChats([]);
                setNotifications([]);
            }
        };

        getUserChats();
    }, [user?._id])

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
