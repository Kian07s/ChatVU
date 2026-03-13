import { useFetchRecipientUser } from "../../hooks/useFetchRecipient.js";
import { FaUser, FaUsers, FaEllipsisV, FaArchive, FaThumbtack } from "react-icons/fa";
import { ArchiveRestore, PinOff } from 'lucide-react';
import { useState, useEffect, useRef } from "react";
import { useContext } from "react";
import { ChatContext } from "../../../Context/ChatContext.jsx";


const UserChat = ({ chat, user, onClick, onlineUsers, isActive, draft, onArchive, isArchived, onPin }) => {
    const {recipientUser} = useFetchRecipientUser({chat, user});
    const { notifications, typingUsers } = useContext(ChatContext);

    const chatName = chat.isGroupChat ? chat.groupName : recipientUser?.name || "Loading";
    
    const [dropDownOpen, setDropDownOpen] = useState(false); //for dropdown
    const [isBottom, setIsBottom] = useState(false); //to make layout of dropdown adaptable to chat position

    //pin status
    const isPinned = chat.pinnedBy?.some(id => id?.toString() === user?._id?.toString());

    // Check if this specific recipient is online
    const isOnline = onlineUsers?.some((u) => u?.userId === recipientUser?._id);

    //for chat notifications
    const thisChatNotifications = notifications.filter(n => n && n.chatId === chat._id);


    //dropdown should close whenever clicking outside
    const dropdownRef = useRef(null);

    const chatTypingUsers = typingUsers[chat._id] || [];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropDownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    //checks to see if chat is in the bottom 30% of the screen, to be used for dropdown positioning
    const handleToggle = (e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        setIsBottom(rect.top > viewportHeight * 0.7); 
        setDropDownOpen(!dropDownOpen);
    };

    // Logic to determine status color
    const getStatusColor = () => {
        const onlineEntry = onlineUsers.find(u => u.userId === recipientUser?._id);
            if (!onlineEntry) return "bg-gray-400"; // Offline
            return onlineEntry.status === "idle" ? "bg-yellow-500" : "bg-green-500";
};
    
    return (
            <div onClick={onClick} className={`flex-1 flex w-full text-left px-4 py-3 relative transition border-b hover:bg-gray-100 ${isActive ? "bg-gray-100 border-l-4 border-[#3594b6]" : "bg-white"}`}>
                {/* show pi if the chat is pinned and not in archive */}
                {isPinned && !isArchived && (
                    <FaThumbtack className="absolute top-2 right-2 text-[#3594b6] text-sm rotate-45" />
                )}

                {/* Icon */}
                <div className="relative h-10 w-10 mr-5 flex-shrink-0">
                    <div className="h-10 w-10 mr-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {chat.isGroupChat ? (
                            <FaUsers className="text-2xl text-[#3594b6]" />
                        ) : (
                            <FaUser className="text-xl text-[#3594b6]" />
                        )}
                    </div>
            
                    {/* Green dot to show user online, don't want that for groups*/}
                    {isOnline &&  !chat.isGroupChat && (
                        <span className={`absolute top-6 right-0 h-4 w-4 border-2 border-white rounded-full ${getStatusColor()}`}></span>
                    )}
                </div>
                

                {/* chatname and most recent text */}
                <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{chatName}</div>
                    {/* Show draft only if it exists and this chat is not currently selected */}
                    <div className={`text-sm truncate ${draft && !isActive ? "text-[#3594b6] italic font-medium" : ""}`}>
                        {draft && !isActive ? (
                            `Draft: ${draft}`
                        ) : chatTypingUsers.length > 0 ? (
                            <span className="italic text-gray-400">
                                {chat.isGroupChat
                                    ? chatTypingUsers.length > 1
                                        ? "Multiple people are typing..."
                                        : `${chatTypingUsers[0]} is typing...`
                                    : "Typing..."}
                            </span>
                        )  : (
                            <div className="flex gap-1 truncate">
                                {/* Logic for Group Chat Sender Name */}
                                {chat.isGroupChat && chat.lastMessage && chat.lastMessage.senderId !== user._id && (
                                    <span className="font-bold shrink-0">
                                        {chat.members?.find(m => m._id === chat.lastMessage.senderId)?.name || "User"}:
                                    </span>
                                )}
                                <span className="truncate">
                                    {chat.lastMessage?.text || "No messages yet"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {thisChatNotifications.length > 0 && (
                    <div className="flex items-center">
                        <div className="flex items-center bg-[#3594b6] text-white text-sm h-8 w-8 rounded-full justify-center">
                            {thisChatNotifications.length}
                        </div>
                    </div>
                )}

                <button onClick={handleToggle} className="flex items-center text-[#8a8b8c] px-3 py-3 cursor-pointer">
                    <FaEllipsisV />
                </button>
    
                {dropDownOpen && (
                    <div ref={dropdownRef} className= {`z-10 absolute right-0 w-38 bg-white rounded-md shadow-xl text-[#3594b6] border ${isBottom ? "bottom-10" : "top-0 mt-10"}`}>

                        <button onClick={(e) => {
                                    e.stopPropagation();
                                    onArchive(chat._id);    //move chat to or out of archive folder
                                    setDropDownOpen(false)
                                }} 
                            className="w-full flex cursor-pointer hover:bg-gray-100 px-2 py-2 border-b border-[#5a5b5c] text-sm">
                                <span className="mx-2 w-5 h-5 flex items-center justify-center">{isArchived ? <ArchiveRestore /> : <FaArchive /> }</span>
                                <span>{isArchived ?  "Unarchive Chat" :  "Archive Chat"}</span>
                        </button>

                        {!isArchived && (
                            <button onClick={(e) => {
                                    e.stopPropagation();
                                    onPin(chat._id); 
                                    setDropDownOpen(false)}} 
                                className="flex w-full text-left px-2 py-2 hover:bg-gray-100 cursor-pointer text-sm">
                                    <span className="w-5 h-5 flex items-center justify-center mx-2">{isPinned ? <PinOff /> : <FaThumbtack /> }</span>
                                    <span>{isPinned ?  "Unpin Chat" :  "Pin Chat"}</span>
                            </button>
                        )}
                        
                    </div>
                )}
            </div>
    );
};

export default UserChat;