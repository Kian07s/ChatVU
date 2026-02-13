import { useFetchRecipientUser } from "../../hooks/useFetchRecipient.js";
import { FaUser, FaUsers } from "react-icons/fa";

const UserChat = ({ chat, user, onClick }) => {
    const {recipientUser} = useFetchRecipientUser({chat, user});

    const chatName = chat.isGroupChat ? chat.groupName : recipientUser?.name || "Loading";
    
    return (
        <button
            onClick={onClick}
            className="flex w-full text-left px-4 py-3 border-b hover:text-[#3594b6]"
        >
            {/* Icon */}
            <div className="h-10 w-10 mr-5 rounded-full bg-gray-200 flex items-center justify-center">
                {chat.isGroupChat ? (
                    <FaUsers className="text-2xl text-[#3594b6]" />
                ) : (
                    <FaUser className="text-xl text-[#3594b6]" />
                )}
            </div>
            
            <div>
                <div className="font-medium">{chatName}</div>
                <div className="text-sm truncate">
                    {chat.lastMessage?.text || "No messages yet"}
            </div>
            </div>
            

        </button>
    );
};

export default UserChat;