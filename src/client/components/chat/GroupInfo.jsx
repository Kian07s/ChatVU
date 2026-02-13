//to be shown when user clicks on Group header, showing group info
import { ChevronLeft } from "lucide-react";
import { FaUser } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import { baseUrl } from "../../../utils/services";
const GroupInfo = ({ chat, user, onBack, updateSelectedChat, setUserChats, setSelectedChat, setView }) => {
    //save admin in order to only give admin certain functionalities
    const isAdmin = chat.groupAdmin === user._id;

    const handleRemove = async (member) => {
        const confirmed = window.confirm(
            `Remove ${member.name} from "${chat.groupName}"?`
        );
        if (!confirmed) {
            return;
        }
    
        const response = await fetch(`${baseUrl}/chats/${chat._id}/remove`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                memberId: member._id,
                requesterId: user._id
            })
        });
    
        const data = await response.json();

        if (!response.ok) return;

        // If the group has been reduced to a DM
        if (data.replacedBy === "dm") {
            setUserChats(prev => {
                const filtered = prev.filter(c => c._id !== chat._id && c._id !== data.chat._id);
                return [...filtered, data.chat];
            });
            setSelectedChat(data.chat);
            setView("messages");

        } 
        else {
            // Normal member removal
            setUserChats(prev => prev.map(c => c._id === chat._id ? data : c));
            updateSelectedChat(data);
        }
    };

    //leaving group
    const handleLeave = async()=> {
        const confirmed = window.confirm(
            `Do you want to leave "${chat.groupName}"?`
        );
        if (!confirmed) {
            return;
        }

        const response = await fetch(`${baseUrl}/chats/${chat._id}/leave`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user._id })
        });
    
        const data = await response.json();
    
        if (!response.ok) {
            alert(data.message || "Failed to leave group");
            return;
        }

        setUserChats(prev => prev.filter(c => c._id !== chat._id));
        setSelectedChat(null);
        setView("messages");
        onBack();
    }

    return (
        <div className="flex-1 p-4 text-center">
            <div className="relative flex items-center mb-10">
                <button
                    onClick={onBack}
                    className="absolute left text-sm text-[#3594b6] cursor-pointer"
                >
                    <ChevronLeft size={24} />
                </button>

                <h2 className="mx-auto text-xl font-bold">
                    {chat.groupName}
                </h2>
            </div>

            {/* Members */}
            <div className="mb-10">
                <h3 className="font-semibold mb-2 text-lg underline text-center">Members</h3>
                <div className="space-y-3">
                    {chat.members.map(member => (
                        <div key={member._id} className="flex items-center p-3 rounded-md shadow-sm">
                            {/* Icon */}
                            <div className="h-10 w-10 mr-5 rounded-full bg-gray-200 flex items-center justify-center">
                                <FaUser className="text-xl text-[#3594b6]"/>
                            </div>
                                        
                            <span>{member.name}</span>
                            <span className="font-medium">
                                {member._id === user._id && (
                                    <span className="ml-2 text-xs text-gray-500">(you)</span>
                                )}
                            </span>

                            {isAdmin && member._id !== user._id && (
                                <button onClick={() => handleRemove(member)} className="ml-auto text-red-500 text-sm cursor-pointer h-10 w-10 rounded-full hover:bg-gray-200 flex items-center justify-center">
                                    <FiTrash2 size={20} color="red"/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Admin controls */}
            {isAdmin && (
                <div className="mb-6">
                    <div className="flex flex-col items-center">
                        <button className="h-8 w-sm rounded-md text-white bg-[#3594b6] hover:bg-[#2a3441] cursor-pointer mb-2">
                            Change group name
                        </button>
                        <button className="h-8 w-sm rounded-md text-white bg-[#3594b6] hover:bg-[#2a3441] cursor-pointer mb-2">
                            Add members
                        </button>
                        {/* Leave group */}
                        <button className="bg-red-500 hover:bg-red-700 font-semibold cursor-pointer h-8 w-sm rounded-md text-white" onClick={handleLeave}>
                            Leave group
                        </button>
                    </div>
                </div>
            )}    
        </div>
    );
};

export default GroupInfo;