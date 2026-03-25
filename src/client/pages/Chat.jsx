import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../../Context/AuthContext";
import {ChatContext} from "../../Context/ChatContext";
import { useFetchRecipientUser } from "../hooks/useFetchRecipient";
import { IoPaperPlane } from "react-icons/io5";
import { FaInfoCircle, FaArchive } from "react-icons/fa";
import { ChevronLeft, MoveDown, Paperclip } from "lucide-react";
import UserChat from "../components/chat/UserChat";
import NewChat from "../components/chat/NewChat";
import GroupInfo from "../components/chat/GroupInfo";
import { patchRequest, baseUrl, getRequest, postRequest, postMultipartRequest } from "../../utils/services";
import messageSend from "../../assets/messageSend.mp3";
import { toast } from "react-hot-toast";


const Chat = () => {
    const [showNewChat, setShowNewChat] = useState(false); //for searching new chats
    const [chatSearch, setChatSearch] = useState(""); //for searching through active chats
    const [messageDrafts, setMessageDrafts] = useState({}); //bound message inputs to chats
    const [chatListView, setChatListView] = useState("active");  //state to switch between active chats and archive
    const [view, setView] = useState("messages"); //to be able to show group info
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true); //state to check where user is for scroll
    const [newMessageBoundary, setNewMessageBoundary] = useState(null);
    const typingTimeouts = useRef({});
    const newMessagesRef = useRef(null); //to identify the new messages to put a new Messages line
    const messagesEndRef = useRef(null); //used for scroll container to stick to bottom
    const textareaRef = useRef(null);
    const sendSound = useRef(null); //send message sound effect
    const { userChats, isUserChatsLoading, setUserChats, messages, setMessages, notifications, setNotifications, selectedChat, setSelectedChat, socket, typingUsers, setTypingUsers, updateTypingUsers, onlineUsers} = useContext(ChatContext); 
    //for file sending and preview
    const [fileDrafts, setFileDrafts] = useState({}); // Stores the actual File object
    const [previewDrafts, setPreviewDrafts] = useState({}); // Stores the base64/URL for UI
    const fileInputRef = useRef(null); // To trigger the hidden input

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

        //Initialize sound effects
        sendSound.current = new Audio(messageSend);
        sendSound.current.volume = 0.2;     // 20% volume


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
            toast.error("You can only pin up to 5 chats.");
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

    //find first unread message
    const firstUnreadIndex = messages?.findIndex((m) => m.senderId !== user._id && !m.seenBy?.includes(user._id));

    //runs every time the text box changes to resize it
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            // Set height to match the internal content (scrollHeight)
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [messageDrafts[selectedChat?._id]]);


    //set new Messages line
    useEffect(() => {
        if (!selectedChat || !messages?.length) {
            return;
        }

        //find first unread message
        const firstUnreadIndex = messages?.findIndex((m) => m.senderId !== user._id && !m.seenBy?.includes(user._id));

        setNewMessageBoundary(firstUnreadIndex !== -1 ? firstUnreadIndex : null);
    }, [selectedChat?._id, messages.length]);


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

    //go to first unread message on opening chat
    useEffect(() => {
        setTimeout(() => {
            if (newMessageBoundary !== null && newMessagesRef.current) {
                newMessagesRef.current.scrollIntoView({
                    behavior: "auto",
                    block: "center"
                });
            } else {
                scrollToBottom();
            }
        }, 50);
    }, [selectedChat, newMessageBoundary]);

    const handleSendMessage = async () => {
        const currentText = messageDrafts[selectedChat?._id] || "";
        const currentFile = fileDrafts[selectedChat?._id];

        if (!currentText?.trim() && !currentFile) {
            return;
        }

        const formData = new FormData();
        formData.append("chatId", selectedChat._id || "");
        formData.append("senderId", user._id || "");
        formData.append("text", currentText.trim());
        
        if (currentFile) {
            formData.append("file", currentFile);
        }

        // Call API to save to MongoDB
        const response = await postMultipartRequest(`${baseUrl}/messages`, formData);
    
        if (response.error) {
            return console.log(response.error);
        }

        setMessageDrafts(prev => ({ ...prev, [selectedChat._id]: "" }));

        //emit via socket so the other person sees it instantly
        emitMessage(response);
        
        // Update UI
        setMessages((prev) => [...prev, response]);

        clearFile();

        //play send sound effect
        if (sendSound.current) {
            sendSound.current.currentTime = 0;
            sendSound.current.play().catch(() => {});
        }

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
        return `${diffInDays} day(s) ago`;
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
        if (!selectedChat || !messages?.length || !messagesEndRef?.current) {
            return;
        }
        const container = messagesEndRef.current;
        const scrollThreshold = 100; // px from bottom considered "seen"
        const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;

        const unseenMessages = messages.filter(m => m.senderId !== user._id && !m.seenBy?.includes(user._id));
        if (!unseenMessages.length || !atBottom) return;

        setMessages(prev => prev.map(m => {
                if (!m) return m;

                if (!m.seenBy?.includes(user._id)) {
                    return { ...m, seenBy: [...(m.seenBy || []), user._id] };
                }
                return m;
            })
        );

        // Update userChats lastMessage seenBy too
        setUserChats(prev => prev.map(c => {
            if (c._id === selectedChat._id && c.lastMessage) {
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

    //for formatting dates for messages
    const formatMessageDate = (dateString) => {
        const messageDate = new Date(dateString);
        const now = new Date();

        // Reset hours to compare just the calendar days
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        const startOfMessageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());

        if (startOfMessageDay.getTime() === startOfToday.getTime()) {
            return "Today";
        } else if (startOfMessageDay.getTime() === startOfYesterday.getTime()) {
            return "Yesterday";
        } else {
            const diffInDays = Math.floor((startOfToday - startOfMessageDay) / (1000 * 60 * 60 * 24));
        
            if (diffInDays < 7) {
                // Returns "Monday", "Tuesday", etc.
                return messageDate.toLocaleDateString(undefined, { weekday: 'long' });
            } else {
                // Returns extended date
                return messageDate.toLocaleDateString(undefined, { 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric' 
                });
            }
        }
    };

    //for selecting a file
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file || !selectedChat) {
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

        if (!allowedTypes.includes(file.type)) {
            toast.error("Only images, PDFs, and Word documents are allowed.");
            e.target.value = ""; // Reset input
            return;
        }

        // Store file in the specific chat's draft
        setFileDrafts(prev => ({ ...prev, [selectedChat._id]: file }));

        //if it's an image, create an image preview
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => setPreviewDrafts(prev => ({ ...prev, [selectedChat._id]: reader.result }));
            reader.readAsDataURL(file);
        }
        else {
            // For non-images (PDFs, etc.), just show the name
            setPreviewDrafts(prev => ({ ...prev, [selectedChat._id]: { name: file.name, type: "file" } }));
        }
    };

    const clearFile = () => {
        if (!selectedChat) {
            return;
        }
        
        setFileDrafts(prev => {
            const newState = { ...prev };
            delete newState[selectedChat._id];
            return newState;
        });

        setPreviewDrafts(prev => {
            const newState = { ...prev };
            delete newState[selectedChat._id];
            return newState;
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

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
        <div className="w-[350px]  min-w-[300px] flex-shrink-0 border-r flex flex-col" style={ {minHeight: 0}}>
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
                            draft={
                                messageDrafts[chat._id] || fileDrafts[chat._id] ? (messageDrafts[chat._id] ? messageDrafts[chat._id] : "Attachment") : null
                            }
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
                                draft={
                                    messageDrafts[chat._id] || fileDrafts[chat._id] ? (messageDrafts[chat._id] ? messageDrafts[chat._id] : "Attachment") : null
                                }
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
                            {messages?.map((m, index) => {
                                //Logic to determine if should show a Date Separator
                                const messageDateLabel = formatMessageDate(m.createdAt);
                                const previousMessage = messages[index - 1];
                                const previousDateLabel = previousMessage ? formatMessageDate(previousMessage.createdAt) : null;
                                // Only show the date bubble if it's the first message or the date label changed
                                const showDateSeparator = messageDateLabel !== previousDateLabel;

                                //Sender Logic
                                const isSender = m.senderId === user._id;
                                const sender = selectedChat?.members?.find(mem => mem._id === m.senderId);
                                //find last message user sent to put delivered/seen under
                                const lastSentMessageId = [...messages].reverse().find(m => m.senderId === user._id)?._id;

                                
                                return (
                                    <div key={m._id}>
                                        {/* The Date Separator UI */}
                                        {showDateSeparator && (
                                            <div className="flex justify-center my-6">
                                                <span className="bg-gray-200 text-gray-600 text-[10px] uppercase tracking-wider px-3 py-1 rounded-md font-bold shadow-sm">
                                                    {messageDateLabel}
                                                </span>
                                            </div>
                                        )}

                                        {/* New Messages Divider */}
                                        {index === newMessageBoundary && (
                                            <div
                                                ref={newMessagesRef}
                                                className="flex items-center my-3"
                                            >
                                                <div className="flex-grow border-t border-gray-300"></div>
                                                <span className="px-3 text-xs text-gray-500 font-semibold">
                                                    New Messages
                                                </span>
                                                <div className="flex-grow border-t border-gray-300"></div>
                                            </div>
                                        )}

                                        {m.type === "system" ? (
                                            <div className="flex justify-center my-4">
                `                               <span className="bg-gray-100 text-gray-500 text-[11px] px-4 py-1 rounded-full italic shadow-sm border border-gray-200">
                                                    {m.text}
                                                </span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className={`flex flex-col ${isSender ? "items-end mr-4" : "items-start ml-4"}`}>
                                                    {/* Show name if it's a group chat and NOT the current user */}
                                                    {selectedChat.isGroupChat && !isSender && (
                                                        <span className="text-[10px] text-gray-500 ml-2 mb-1">
                                                            {sender?.name || "Unknown User"}
                                                        </span>
                                                    )}
                                        
                                                    <div className={`max-w-[70%] p-2 rounded-2xl message-bubble message-animation whitespace-pre-wrap
                                                        ${m.senderId === user._id ? "bg-[#3594b6] text-white self-end rounded-tr-none bubble-right" : "bg-gray-200 self-start rounded-tl-none bubble-left"}`} >

                                                            {/* Render Image if it exists */}
                                                            {m.fileUrl && (m.type === "image" || m.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) && (
                                                                <div className="mb-2">
                                                                    <img 
                                                                        src={`http://localhost:5050${m.fileUrl}`} 
                                                                        alt="Sent attachment" 
                                                                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                                        onClick={() => window.open(`http://localhost:5050${m.fileUrl}`, '_blank')}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Render File Link if it's not an image */}
                                                            {m.fileUrl && m.type === "file" && (
                                                                <a 
                                                                    href={`http://localhost:5050${m.fileUrl}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 p-2 mb-2 bg-black/10 rounded-lg text-xs font-medium hover:bg-black/20 transition-colors"
                                                                >
                                                                    <Paperclip size={14} />
                                                                    <span className="truncate max-w-[150px]">View Attachment</span>
                                                                </a>
                                                            )}

                                                            {m.text && <p className="text-sm">{m.text}</p>}
                                                            <span className="block text-[10px] opacity-70 text-right">
                                                                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], {
                                                                    hour: 'numeric',
                                                                    minute: '2-digit'
                                                                }) : ""}
                                                            </span>
                                                    </div>
                                                </div>

                                                {isSender && !selectedChat.isGroupChat && m._id === lastSentMessageId && (
                                                    <span className="block text-[10px] opacity-70 text-right mr-4">
                                                        {index === messages.length - 1 ? m.seenBy?.includes(recipientUser?._id)
                                                            ? "Seen"
                                                            : "Delivered" 
                                                            : ""}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
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
                                {/* Hidden Input */}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileSelect} 
                                    className="hidden" 
                                />
                                {/* Paperclip icon for attaching files */}
                                <button onClick={() => fileInputRef.current.click()} className="mr-2 cursor-pointer hover:bg-gray-200 h-8 w-8 flex justify-center items-center rounded-full">
                                    <Paperclip/>
                                </button>

                                {/* Input */}
                                <div className="flex-1">
                                    
                                    {/* PREVIEW AREA */}
                                    {previewDrafts[selectedChat?._id] && (
                                        <div className="p-2 bg-gray-100 flex items-center relative border-b">
                                            {typeof previewDrafts[selectedChat?._id] === "string" ? (
                                                <img src={previewDrafts[selectedChat?._id]} alt="preview" className="h-20 w-20 object-cover rounded-md border" />
                                            ) : (
                                                <div className="flex items-center gap-2 p-2 bg-white rounded border text-sm text-gray-600">
                                                    <span className="font-medium truncate max-w-[200px]">{previewDrafts[selectedChat?._id]?.name}</span>
                                                </div>
                                            )}
                                            <button 
                                                onClick={clearFile}
                                                className="absolute top-1 left-22 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-md"
                                            >
                                                <span className="block w-4 h-4 text-[10px] leading-none">×</span>
                                            </button>
                                        </div>
                                    )}

                                    <textarea
                                        ref={textareaRef}
                                        rows="1"
                                        placeholder="Type a message..."
                                        value={messageDrafts[selectedChat?._id] || ""} //find current chat's draft
                                        onChange={(e) => {
                                            handleInputChange(e.target.value);
                                            handleTyping(e.target.value);
                                            
                                        }}

                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey)  {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        className="w-full border rounded px-3 py-2 outline-none focus:border-[#3594b6] resize-none overflow-hidden max-h-40"
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
                            updateSelectedChat={setSelectedChat}
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