import { useContext, useState } from "react";
import { AuthContext } from "../../Context/AuthContext";
import {ChatContext} from "../../Context/ChatContext";
import { useFetchRecipientUser } from "../hooks/useFetchRecipient";
import { IoChevronDown, IoChevronUp, IoPaperPlane } from "react-icons/io5";
import UserChat from "../components/chat/UserChat";
import NewChat from "../components/chat/NewChat";
import GroupInfo from "../components/chat/GroupInfo";

const Chat = () => {
    const [selectedChat, setSelectedChat] = useState(null); //selected chat to open
    const [showChatList, setShowChatList] = useState(true); //showing chatlist toggle, to be initally true 
    const [showNewChat, setShowNewChat] = useState(false); //for searching new chats
    const [chatSearch, setChatSearch] = useState(""); //for searching through active chats
    const { userChats, isUserChatsLoading, setUserChats} = useContext(ChatContext); 
    const [view, setView] = useState("messages"); //to be able to show group info
    const { user } = useContext(AuthContext); 
    const { recipientUser } = useFetchRecipientUser({
        chat: selectedChat,
        user
    });

    const openChat = (chat) => {
        setSelectedChat(chat);
        setShowChatList(false);
        setView("messages"); //ensures that when user opens a new chat it's in the messages page and not in members page
    };

    const toggleChatList = () => {
        setShowChatList(!showChatList);
    };

    const filteredChats = userChats.filter(chat => {
        const chatName = chat.isGroupChat ? chat.groupName : chat.members.find(m => m._id !== user._id)?.name || "";
        return chatName.toLowerCase().includes(chatSearch.toLowerCase());
    });

    return (
    
    <div className="flex w-full flex flex-col bg-white" style={{ height: "calc(100vh - 4rem)" }}>

        {/*imported ui from NewChat*/}
        {showNewChat && (
            <NewChat onClose={() => setShowNewChat(false)} />
        )}

        {/* Collapsable chat list */}
        <div className={`flex flex-col transition-all duration-300 overflow-hidden border-b
            ${showChatList ? "h-full" : "h-14"}`}>
                {/* header */}
                <div className="h-14 flex items-center justify-between px-4 border-b bg-white cursor-pointer shadow-lg" onClick={toggleChatList}>
                    <h1 className="font-semibold text-[#3594b6] text-xl">Chats</h1>

                    {showChatList ? (
                        <IoChevronUp className="text-2xl text-[#3594b6]" />
                    ) : (
                      <IoChevronDown className="text-2xl text-[#3594b6]" />
                    )}
                </div>
                {/* Chat list content */}
                {showChatList && (
                    <div className="overflow-y-auto flex-1">

                        <div className="flex m-2">
                            <input
                                type="text"
                                value={chatSearch}
                                onChange={(e) => setChatSearch(e.target.value)}
                                placeholder="Search..."
                                className="flex-1 border rounded px-3 py-2 outline-none focus:border-[#3594b6]"  
                            />
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); 
                                    setShowNewChat(true);
                                }}
                                className="ml-2 text-md text-white hover:bg-[#2a3441] bg-[#3594b6] rounded-md cursor-pointer p-2"
                            >
                                New Chat
                            </button>
                        </div>
                        

                        {isUserChatsLoading && (
                            <div className="p-2">Loading chats...</div>
                        )}

                        {!isUserChatsLoading && userChats?.length === 0 && (
                            <div className="p-2">No chats yet. Click 'New Chat' to start one.</div>
                        )}

                        {!isUserChatsLoading && (
                            filteredChats.map((chat) => (
                                <UserChat
                                    key={chat._id}
                                    chat={chat}
                                    user={user}
                                    onClick={() => openChat(chat)}
                                />
                            ))
                        )}

                        {!isUserChatsLoading && userChats.length > 0 && chatSearch.trim() !== "" && filteredChats.length === 0 && (
                            <div className="p-2 text-center">No active chats match your search</div>
                        )}
                    </div>
                )}
            </div>

            {/* Chat window */}
            {!showChatList && (
                <div className="flex-1 flex flex-col">
                    {!selectedChat ? (
                        <div className="flex items-center justify-center h-full">
                            Select a chat to start messaging
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            {view === "messages" && (
                                <div className="h-14 flex items-center px-4 border-b font-semibold shadow-2xl">
                                    {selectedChat.isGroupChat ? (
                                        <button
                                            onClick={() => setView("groupInfo")}
                                            className="cursor-pointer"
                                        >
                                            {selectedChat.groupName}
                                        </button>

                                    ) : (
                                        <div>
                                            {recipientUser?.name || "Loading..."}
                                        </div>
                                    )}
                                </div>
                            )}
                            

                            {/* Messages */}
                            {view === "messages" ? (
                                <>
                                    <div className="flex-1 p-4 overflow-y-auto">Messages go here…</div>

                                    <div className="flex border-t p-3">
                                        {/* Input */}
                                        <div className="flex-1">
                                            <input 
                                                type="text"
                                                placeholder="Type a message..."
                                                className="w-full border rounded px-3 py-2 outline-none focus:border-[#3594b6]"
                                            />
                                        </div>
                                        <button className="flex items-center justify-center h-12 w-12 bg-[#3594b6] text-white rounded-full cursor-pointer ml-4"><IoPaperPlane size={20} /></button>
                                    </div>
                                </>
                            ) : (
                                <GroupInfo
                                    chat={selectedChat}
                                    user={user}
                                    onBack={() => setView("messages")}
                                    updateSelectedChat={setSelectedChat}
                                    setUserChats={setUserChats} 
                                    setSelectedChat={setSelectedChat}
                                    setView={setView}
                                />
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
 
export default Chat;hDbiAdfjob