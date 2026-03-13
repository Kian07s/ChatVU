import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../../Context/AuthContext";
import {ChatContext} from "../../Context/ChatContext";
import { useFetchRecipientUser } from "../hooks/useFetchRecipient";
import { IoPaperPlane } from "react-icons/io5";
import { FaInfoCircle, FaArchive } from "react-icons/fa";
import { ChevronLeft, MoveDown } from "lucide-react";
import UserChat from "../components/chat/UserChat";
import NewChat from "../components/chat/NewChat";
import GroupInfo from "../components/chat/GroupInfo";
import { patchRequest, baseUrl, getRequest, postRequest } from "../../utils/services";

const Chat = () => {
    const [showNewChat, setShowNewChat] = useState(false); //for searching new chats
    const [chatSearch, setChatSearch] = useState(""); //for searching through active chats
    const [messageDrafts, setMessageDrafts] = useState({}); //bound message inputs to chats
    const [chatListView, setChatListView] = useState("active");  //state to switch between active chats and archive
    const typingTimeouts = useRef({});
    const messagesEndRef = useRef(null); //used for scroll container to stick to bottom
    const [isAtBottom, setIsAtBottom] = useState(true); //state to check where user is for scroll
    const { userChats, isUserChatsLoading, setUserChats, messages, setMessages, notifications, setNotifications, selectedChat, setSelectedChat, socket, typingUsers, setTypingUsers, updateTypingUsers,markMessagesAsSeen, onlineUsers} = useContext(ChatContext); 
    const [view, setView] = useState("messages"); //to be able to show group info
    const [showScrollButton, setShowScrollButton] = useState(false);

    const { user } = useContext(AuthContext); 
    const { recipientUser } = useFetchRecipientUser({
        chat: selectedChat,
        user
    });

    //for archiving chats
    const activeChats = userChats?.filter(chat => {
        return !chat.archivedBy?.some(id => id?.toString() === user?._id?.toString())
    }) || [];
    
    const archivedChats = userChats?.filter(chat => {
        return chat.archivedBy?.some(id => id?.toString() === user?._id?.toString())
    }) || [];
    
    const currentList = chatListView === "active" ? activeChats : archivedChats;

    //Calculate how many are currently pinned
    const pinnedCount = activeChats.filter(chat => 
        chat.pinnedBy?.some(id => id?.toString() === user?._id?.toString())
    ).length;

    const filteredChats = currentList
        .filter(chat => {
            const chatName = chat.isGroupChat 
                ? chat.groupName 
                : chat.members?.find(m => m?._id?.toString() !== user?._id?.toString())?.name || "Unknown User";
            return chatName.toLowerCase().includes(chatSearch.toLowerCase());
        })
        .sort((a, b) => {
            // Check if user has pinned chats
            const aPinned = a.pinnedBy?.some(id => id?.toString() === user?._id?.toString());
            const bPinned = b.pinnedBy?.some(id => id?.toString() === user?._id?.toString());
    
            if (aPinned && !bPinned) return -1; // a comes first
            if (!aPinned && bPinned) return 1;  // b comes first
            //Then sort by latest message date
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });

    //get chat members other than the user themselves
    const getRecipients = (chat) => {
        if (!chat || !chat.members) {
            return [];
        }
        return chat.members.filter(m => String(m._id) !== String(user._id));
    };

    const emitMessage = (message) => {
        const recipients = getRecipients(selectedChat);

        if (!recipients.length) {
            return;
        }
        recipients.forEach(recipient => {
            socket.emit("sendMessage", {...message, recipientId: recipient._id});
        })
    }

    //to handle drafts for messages
    const handleInputChange = (text) => {
        if (!selectedChat) {
            return;
        }
        setMessageDrafts(prev => ({
            ...prev,
            [selectedChat._id]: text
        }));
    };
    //archiving and unarchiving chats
    const handleArchive = async(chatId) => {
        try {
            const updatedChat = await patchRequest(`${baseUrl}/chats/${chatId}/archive`, { requesterId: user._id });
      
            if (updatedChat?.error) {
                console.error("Failed to archive chat:", updatedChat.message);
                return;
            }

            setUserChats(prev => prev.map(c => c._id === chatId ? updatedChat : c));
        
            if (selectedChat?._id === chatId) {
                setSelectedChat(updatedChat);
            }
        } catch (error) {
            console.error("Unexpected error in handleArchive:", error);
        }
    };

    //pin and unpin chats
    const handlePin = async(chatId) => {
        const targetChat = userChats.find(c => c._id === chatId);
        const isCurrentlyPinned = targetChat?.pinnedBy?.some(id => id?.toString() === user?._id?.toString());

        if (!isCurrentlyPinned && pinnedCount >= 5) {
            alert("You can only pin up to 5 chats.");
            return;
        }

        try {
            const updatedChat = await patchRequest(`${baseUrl}/chats/${chatId}/pin`, { requesterId: user._id });
      
            if (updatedChat?.error) {
                console.error("Failed to pin chat:", updatedChat.message);
                return;
            }

            setUserChats(prev => prev.map(c => c._id === chatId ? updatedChat : c));
        
            if (selectedChat?._id === chatId) {
                setSelectedChat(updatedChat);
            }
        } catch (error) {
            console.error("Pin error:", error);
        }
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const threshold = 50; //pixels from bottom to be the limit
        setIsAtBottom(scrollHeight - scrollTop - clientHeight < threshold);

        // Show button if scrolled more than 300px from bottom
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);

        //for seen message check
        if (isAtBottom) {
            markChatMessagesAsSeen();
          }
    };

    useEffect(() => {
        if (!selectedChat) return;
    
        const container = messagesEndRef.current;
        if (!container) return;
    
        const scrollThreshold = 100;
        const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;
    
        if (atBottom) {
            markChatMessagesAsSeen();

            setNotifications(prev => prev.filter(n => n && n.chatId !== selectedChat._id));
        }
    }, [messages, selectedChat?._id]);

    //function for messages overflow to go to bottom
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            //allow time for mrssage to render
            setTimeout(() => {
                messagesEndRef.current?.scrollTo({
                    top: messagesEndRef.current.scrollHeight,
                    behavior: "smooth"
                });
            }, 50)
        }
    };

    //don't scroll to bottom if user is not towards the bottom
    useEffect(() => {
        if (isAtBottom) {
            scrollToBottom();
        }
    }, [messages, selectedChat?._id ? typingUsers[selectedChat?._id] : null]);

    //go to most recent message on opening chat
    useEffect(() => {
        scrollToBottom();
    }, [selectedChat]);

    const handleSendMessage = async () => {
        const currentText = messageDrafts[selectedChat?._id];
        if (!currentText?.trim()) {
            return;
        }

        // Call API to save to MongoDB
        const response = await postRequest(`${baseUrl}/messages`, JSON.stringify({
            chatId: selectedChat._id,
            senderId: user._id,
            text: currentText
        }));
    
        if (response.error) {
            return console.log(response.error);
        }

        setMessageDrafts(prev => ({ ...prev, [selectedChat._id]: "" }));

        //emit via socket so the other person sees it instantly
        emitMessage(response);
        
        // Update UI
        setMessages((prev) => [...prev, response]);

        //Move chat to top of list by updating userChats
        setUserChats(prev => {
            const updatedChat = {
                ...selectedChat, 
                lastMessage: response, 
                updatedAt: new Date().toISOString()
            } 
            const otherChats = prev.filter(c => c._id !== selectedChat._id);

            return [updatedChat, ...otherChats];

        });
        // scroll down for own messages**
        scrollToBottom();
    };

    useEffect(() => {
        const getMessages = async () => {
            if (!selectedChat?._id) return;
            const response = await getRequest(`${baseUrl}/messages/${selectedChat._id}`);
            if (!response.error) setMessages(response);
        };
        getMessages();
    }, [selectedChat]);

    useEffect(() => {
        if (!socket) return;

        socket.on("displayTyping", ({ chatId, senderName, isTyping }) => {
            updateTypingUsers(chatId, senderName, isTyping);
        });

        return () => {
            socket.off("displayTyping");
        };
    }, [selectedChat, socket, setTypingUsers]);

    useEffect(() => {
        return () => {
            Object.values(typingTimeouts.current).forEach(clearTimeout);
        };
    }, []);

    const formatLastSeen = (date) => {
        if (!date) return "Never";
        const now = new Date();
        const then = new Date(date);
        const diffInSeconds = Math.floor((now - then) / 1000);
    
        if (diffInSeconds < 60) return "Just now";
        const diffInMins = Math.floor(diffInSeconds / 60);
        if (diffInMins < 60) return `${diffInMins} mins ago`;
        const diffInHours = Math.floor(diffInMins / 60);
        if (diffInHours < 24) return `${diffInHours} hours ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
    };

    const handleTyping = (text) => {
        if (!socket || !selectedChat) {
            return;
        }

        socket.emit("typing", {
            chatId: selectedChat._id,
            senderName: user.name,
            senderId: user._id,
            members: selectedChat.members.map(m => m._id),
            isTyping: text.length > 0
        });

        // clear existing timeout
        if (typingTimeouts.current[selectedChat._id]) {
            clearTimeout(typingTimeouts.current[selectedChat._id]);
        }

        // set new timeout
        typingTimeouts.current[selectedChat._id] = setTimeout(() => {
            socket.emit("typing", {
                chatId: selectedChat._id,
                senderName: user.name,
                senderId: user._id,
                members: selectedChat.members.map(m => m._id),
                isTyping: false
            });
            delete typingTimeouts.current[selectedChat._id];
        }, 3000); // 3 seconds of inactivity
    }

    const markChatMessagesAsSeen = async() => {
        if (!selectedChat || !messagesEndRef?.current) {
            return;
        }
        const container = messagesEndRef.current;
        const scrollThreshold = 100; // px from bottom considered "seen"
        const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;

        const unseenMessages = messages.filter(m => m.senderId !== user._id && !m.seenBy?.includes(user._id));
        if (!unseenMessages.length || !atBottom) return;

        setMessages(prev => prev.map(m => {
                if (!m.seenBy?.includes(user._id)) {
                    return { ...m, seenBy: [...(m.seenBy || []), user._id] };
                }
                return m;
            })
        );

        // Update userChats lastMessage seenBy too
        setUserChats(prev => prev.map(c => {
            if (c._id === selectedChat._id) {
                const updatedLastMessage = {
                    ...c.lastMessage,
                    seenBy: [...(c.lastMessage.seenBy || []), user._id]
                };
                return { ...c, lastMessage: updatedLastMessage };
            }
            return c;
        }));

        // Clear notifications for this chat
        setNotifications(prev => prev.filter(n => n.chatId !== selectedChat._id));

        try {
            console.log("PATCH URL:", `${baseUrl}/messages/${selectedChat._id}/seen`);
            await patchRequest(`${baseUrl}/messages/${selectedChat._id}/seen`, { userId: user._id });
        } catch (error) {
            console.error("Failed to mark messages as  seen: ", error);
        }
    }

    return (
    
    <div className="flex w-full bg-white" style={{ height: "calc(100vh - 4rem)" }}>

        {/*imported ui from NewChat*/}
        {showNewChat && (
            <NewChat 
                onClose={() => setShowNewChat(false)}
                setSelectedChat={setSelectedChat}
                setView={setView}
            />
        )}

        {/* chat list */}
        <div className="w-1/3 border-r flex flex-col" style={ {minHeight: 0}}>
            {/* header */}
            <div className="h-14 flex items-center px-4 border-b bg-white">
                <h1 className="font-semibold text-[#3594b6] text-xl">Chats</h1>
            </div>

            {/* Chat list content  this section to be hidden when in archive*/}
            {chatListView === "active" && (
                <div className="flex m-2 gap-2">
                    <input
                        type="text"
                        value={chatSearch}
                        onChange={(e) => setChatSearch(e.target.value)}
                        placeholder="Search..."
                        className="flex-1 min-w-0 border rounded-full px-3 py-2 outline-none focus:border-[#3594b6]"  
                    />
                        
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); 
                            setShowNewChat(true);
                        }}
                        
                        className="flex-shrink-0 text-md text-white hover:bg-[#2a3441] bg-[#3594b6] rounded-md cursor-pointer p-2"
                    >
                        New
                    </button>
                </div>
            )}

            {/* archived chats folder */}
            {archivedChats.length > 0 && chatListView === "active" && (
                <div
                    className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-200 rounded my-2"
                    onClick={() => setChatListView("archive")}
                >
                    <FaArchive className="mx-3" />
                    <span>Archived Chats ({archivedChats.length})</span>
                </div>
            )}

            {chatListView === "archive" && (
                <div>
                    <div
                        onClick={() => setChatListView("active")}
                        className="flex justify-around items-center px-2 py-2 cursor-pointer border-b"
                    >
                        <ChevronLeft size={24} className="absolute left-0"/>
                        <h1 className="">Archived Chats</h1>
                    </div>

                </div>
            )}

                        
            <div className="flex-1 overflow-y-auto">
                {isUserChatsLoading && (
                    <div className="p-2">Loading chats...</div>
                )}

                {!isUserChatsLoading && userChats?.length === 0 && (
                    <div className="p-2">No chats yet. Click 'New' to start one.</div>
                )}

                {/* Loading chats of active folder */}
                {!isUserChatsLoading && chatListView === "active" &&
                    filteredChats.map((chat) => (
                        <UserChat
                            key={chat._id}
                            chat={chat}
                            user={user}
                            onlineUsers={onlineUsers}
                            draft={messageDrafts[chat._id]}
                            onClick={() => {
                                setSelectedChat(chat);
                                setView("messages");
                            }}
                            isActive={selectedChat?._id === chat._id}

                            //archive feature 
                            isArchived={chat.archivedBy?.some(id => id?.toString() === user?._id?.toString())}
                            onArchive={handleArchive}

                            //pin feature and limit
                            onPin={handlePin}
                            pinLimitReached={pinnedCount >= 5}
                        />
                    ))}

                    {/* Loading chats of archive folder */}
                    {!isUserChatsLoading && chatListView === "archive" &&
                        filteredChats.map((chat) => (
                            <UserChat
                                key={chat._id}
                                chat={chat}
                                user={user}
                                onlineUsers={onlineUsers}
                                draft={messageDrafts[chat._id]}
                                onClick={() => {
                                    setSelectedChat(chat);
                                    setView("messages");
                                }}
                                isActive={selectedChat?._id === chat._id}

                                isArchived={chat.archivedBy?.some(id => id?.toString() === user?._id?.toString())}
                                onArchive={handleArchive}
                            />
                        ))
                    }

                {!isUserChatsLoading && userChats.length > 0 && chatSearch.trim() !== "" && filteredChats.length === 0 && (
                    <div className="p-2 text-center">No active chats match your search</div>
                )}
            </div> 
        </div>
        

        {/* Chat window */}
        <div className="flex-1 flex flex-col">
            {!selectedChat ? (
                <div className="flex items-center justify-center h-full">
                    Select a chat to start messaging
                </div>
            ) : (
                <>
                    {/* Chat Header */}
                    {view === "messages" && (
                        <div className="h-14 flex items-center px-4 border-b font-semibold shadow-md">
                            {selectedChat.isGroupChat ? (
                                <div className="flex">
                                    <div>
                                        {selectedChat.groupName}
                                    </div>
                                    <button 
                                        onClick={() => setView("groupInfo")}
                                        className="text-[#8a8b8c] text-2xl absolute right-5 cursor-pointer hover:text-[#3594b6]">
                                        <FaInfoCircle />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <div>
                                        {recipientUser?.name || "Loading..."}
                                    </div>
                                    <div className="text-xs">
                                        {onlineUsers.some(u => u.userId === recipientUser?._id) ? "Online" 
                                            : `Last seen ${formatLastSeen(recipientUser?.lastSeen)}`}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                            

                    {/* Messages */}
                    {view === "messages" ? (
                        <>
                            <div 
                                className="flex-1 p-4 overflow-y-auto flex flex-col gap-2" 
                                ref={messagesEndRef}
                                onScroll={handleScroll}
                            >
                            {messages?.map((m) => {
                                const isSender = m.senderId === user._id;
                                const sender = selectedChat?.members?.find(mem => mem._id === m.senderId);

                                return (
                                    <div key={m._id} className={`flex flex-col ${isSender ? "items-end mr-4" : "items-start ml-4"}`}>

                                        {/* Show name if it's a group chat and NOT the current user */}
                                        {selectedChat.isGroupChat && !isSender && (
                                            <span className="text-[10px] text-gray-500 ml-2 mb-1">
                                                {sender?.name || "Unknown User"}
                                            </span>
                                        )}
                                        
                                        <div className={`max-w-[70%] p-2 rounded-2xl message-bubble message-animation 
                                            ${m.senderId === user._id ? "bg-[#3594b6] text-white self-end rounded-tr-none bubble-right" : "bg-gray-200 self-start rounded-tl-none bubble-left"}`} >
                                            {m.text}
                                            <span className="block text-[10px] opacity-70 text-right">
                                                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ""}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}

                                {/* Scroll to bottom button */}
                                {showScrollButton && (
                                    <button
                                        onClick={scrollToBottom}
                                        className="absolute right-1 bottom-24 p-2 bg-white text-[#3594b6] rounded-full shadow-lg hover:bg-gray-200 border transition z-50 cursor-pointer"
                                        >
                                            <MoveDown />
                                        </button>
                        
                                )}

                                {typingUsers[selectedChat._id]?.length > 0 && (
                                    <div className="text-gray-400 italic px-2 py-1 text-sm">
                                        {selectedChat.isGroupChat
                                            ? typingUsers[selectedChat._id].length > 1
                                                ? "Multiple people are typing..."
                                                : `${typingUsers[selectedChat._id][0]} is typing...`
                                            : "Typing..."}
                                    </div>
                                )}
                            
                            </div>

                            <div className="flex border-t p-3">
                                {/* Input */}
                                <div className="flex-1">
                                    <input 
                                        type="text"
                                        placeholder="Type a message..."
                                        value={messageDrafts[selectedChat?._id] || ""} //find current chat's draft
                                        onChange={(e) => {
                                            handleInputChange(e.target.value);
                                            handleTyping(e.target.value);
                                            
                                        }}

                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSendMessage();
                                        }}
                                        className="w-full border rounded px-3 py-2 outline-none focus:border-[#3594b6]"
                                    />
                                </div>
                                <button onClick={handleSendMessage} className="flex items-center justify-center h-12 w-12 bg-[#3594b6] text-white rounded-full cursor-pointer ml-4"><IoPaperPlane size={20} /></button>
                            </div>
                        </>
                    ) : (
                        <GroupInfo
                            chat={selectedChat}
                            user={user}
                            onBack={() => setView("messages")}
                            setUserChats={setUserChats} 
                            setSelectedChat={setSelectedChat}
                            setView={setView}
                        />
                    )}
                </>
            )}
        </div>  
        
    </div>    

    );
};
 
export default Chat;