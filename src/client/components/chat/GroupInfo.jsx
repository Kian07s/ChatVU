//to be shown when user clicks on Group header, showing group info
import { ChevronLeft, Pencil, Check } from "lucide-react";
import { FaUser, FaUserPlus } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import { baseUrl, putRequest, getRequest } from "../../../utils/services";
import { useState, useEffect } from "react";
import { useContext } from "react";
import { ChatContext } from "../../../Context/ChatContext";
import toast from "react-hot-toast";

const GroupInfo = ({ chat, user, onBack, updateSelectedChat, setUserChats, setSelectedChat, setView, onClose }) => {
    //save admin in order to only give admin certain functionalities
    const isAdmin = chat.groupAdmin?.toString() === user._id?.toString();
    //for online user recognition
    const { onlineUsers, setMessages } = useContext(ChatContext);

    const [isEditingName, setIsEditingName] = useState(false);
    const [newGroupName, setNewGroupName] = useState(chat.groupName);
    //for chat format ui switch
    const [step, setStep] = useState("type");
    //for adding group members
    const [isAddingMembers, setIsAddingMembers] = useState(false);
    //what the user types and being able to update it using useState
    const [query, setQuery] = useState("");
    //search results (list of users)
    const [results, setResults] = useState([]);
    //while the results are loading
    const [loading, setLoading] = useState(false);
     //group chat members selection
     const [selectedMembers, setSelectedMembers] = useState([]);

     const isMemberOnline = (memberId) => {
        return onlineUsers?.some((user) => user?.userId === memberId);
    };

    // a helper to refresh messages
    const refreshMessages = async () => {
        const response = await getRequest(`${baseUrl}/messages/${chat._id}`);
        if (!response.error) setMessages(response);
    };

    //Searching for users to chat with. Runs every time the query changes
    useEffect(() => {
        const searchUsers = async () => {
            //if the user deletes the text, stop searching, claer results
            if (!query.trim()) {
                setResults([]);
                return;
            }
            setLoading(true);

            //calls backend
            const response = await getRequest(
                `${baseUrl}/users/search?query=${query}`
            );
            setLoading(false);

            if (!response?.error) {
                setResults(response.filter(u => u._id !== user._id && !chat.members.some(m => m._id === u._id)));
            }
        };
        searchUsers();
    }, [query, user._id]);

     //for selecting group members
     const toggleMember = (member) => {
        setSelectedMembers((prev) => {
            const exists = prev.some(m => m._id === member._id);

            if (exists) {
                return prev.filter(m => m._id !== member._id);
            }
    
            return [...prev, member];
        });
    };


    const handleRemove = async (member) => {
        //create custom toast for better ui
        toast((t) => (
            <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">
                    Remove <b>{member.name}</b> from the group?
                </span>
                <div className="flex justify-center gap-2">
                    <button 
                        onClick={() => toast.dismiss(t.id)}
                        className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            toast.dismiss(t.id);
                            executeRemoval(member); // Call the actual logic
                        }}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Remove
                    </button>
                </div>
            </div>
        ), { duration: 6000});
    };
    
    const executeRemoval = async(member) => {
        const loadingToast = toast.loading(`Removing ${member.name}...`);

        const response = await fetch(`${baseUrl}/chats/${chat._id}/remove`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                memberId: member._id,
                requesterId: user._id
            })
        });
    
        const data = await response.json();

        if (response.ok) {
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
            await refreshMessages();

            // Success Feedback
            toast.success(`${member.name} removed`, { id: loadingToast });
        }
        else {
            toast.error(data.message || "Failed to remove member", { id: loadingToast });
        }
    };


    const handleAddMembers = async() => {
        if (selectedMembers.length === 0) {
            return;
        } 

        toast((t) => (
            <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">
                    Add <b>{selectedMembers.length}</b> member(s) to the group?
                </span>
                <div className="flex justify-end gap-2">
                    <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            toast.dismiss(t.id);
                            executeAddMembers();
                        }}
                        className="px-3 py-1 text-xs bg-[#3594b6] text-white rounded hover:bg-[#2a3441]"
                    >
                        Add
                    </button>
                </div>
            </div>
        ), { duration: 6000 });
    };

    const executeAddMembers = async () => {
        const loadingToast = toast.loading("Adding members...");

        try {
            const response = await fetch(`${baseUrl}/chats/${chat._id}/add`, {
                method: "PUT",
                headers: { "Content-Type": "application/json"},
                body: JSON.stringify({
                    memberIds: selectedMembers.map(m => m._id),
                    requesterId: user._id
                })
            });
    
            const data = await response.json();
    
            if (response.ok) {
                setUserChats(prev => prev.map(c => c._id === chat._id ? data : c));
                updateSelectedChat(data); // This pushes the new member list up to the parent
                // Reset UI
                setStep("type");
                setSelectedMembers([]);
                await refreshMessages();
                toast.success("Members added successfully", { id: loadingToast });
            } 
            else {
                toast.error(data.message || "Failed to add members", { id: loadingToast });
            }
            
            // Update chat state everywhere
            setUserChats(prev =>
                prev.map(c => c._id === chat._id ? data : c)
            );
    
            updateSelectedChat(data);
    
            // Reset modal state
            setSelectedMembers([]);
            setQuery("");
            setResults([]);
            setStep("type");
            setView("groupInfo");
        }  catch (error) {
            toast.error("An error occurred", { id: loadingToast });
        }
    };

    const handleNameChange = async() => {
        if (!newGroupName.trim() || newGroupName === chat.groupName) {
            setIsEditingName(false);
            return;
        }

        toast((t) => (
            <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">
                    Change group name to <b>"{newGroupName}"</b>?
                </span>
                <div className="flex justify-end gap-2">
                    <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            toast.dismiss(t.id);
                            executeNameChange();
                        }}
                        className="px-3 py-1 text-xs bg-[#3594b6] text-white rounded hover:bg-[#2a3441]"
                    >
                        Update
                    </button>
                </div>
            </div>
        ), { duration: 6000 });
    }

    const executeNameChange = async() => {
        const loadingToast = toast.loading("Updating group name...");

        try {
            const response = await putRequest(
                `${baseUrl}/chats/${chat._id}/changeName`,
                JSON.stringify({ newGroupName: newGroupName.trim(), requesterId: user._id })
            );
        
            if (!response.error) {
                setUserChats((prev) => prev.map((c) => (c._id === chat._id ? response : c)));
                updateSelectedChat(response);
                setIsEditingName(false);
                await refreshMessages();
    
                toast.success("Group name updated!", { id: loadingToast });
            }
            else {
                toast.error("Failed to update name", { id: loadingToast });
            }
    
            updateSelectedChat(response);
            setUserChats((prev) => prev.map((c) => (c._id == chat._id ? response : c))
            );
    
            setIsEditingName(false);
        } catch (error) {
            toast.error("An error occurred", { id: loadingToast });
        }
    };

    //leaving group
    const handleLeave = async()=> {
        toast((t) => (
            <div className="flex flex-col gap-3">
                <span className="text-sm font-medium">
                    Are you sure you want to leave <b>"{chat.groupName}"</b>?
                </span>
                <div className="flex justify-end gap-2">
                    <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            toast.dismiss(t.id);
                            executeLeave();
                        }}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Leave
                    </button>
                </div>
            </div>
        ), { duration: 6000 });
    };

    const executeLeave = async () => {
        const loadingToast = toast.loading("Leaving group...");

        try {
            const response = await fetch(`${baseUrl}/chats/${chat._id}/leave`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user._id })
            });
        
            const data = await response.json();
        
            if (response.ok) {
                toast.success("You left the group", { id: loadingToast });
                setUserChats(prev => prev.filter(c => c._id !== chat._id));
                setSelectedChat(null);
                setView("messages");
                onBack();
            }
            else {
                toast.error(data.message || "Failed to leave", { id: loadingToast });
            }
        } catch (error) {
            toast.error("An error occurred", { id: loadingToast });
        }  
    };

    return (
        <div className="flex-1 p-4 text-center">
            <div className="relative flex items-center mb-10 pb-2 border-b">
                <button
                    onClick={onBack}
                    className="absolute left text-sm text-[#3594b6] cursor-pointer"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="mx-auto text-xl font-bold">
                    {isAdmin && isEditingName ? (
                        <input
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="border-b border-[#3594b6] outline-none text-center" autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleNameChange();
                                }
                            }}
                        />
                    ) : (
                        <span>{chat.groupName}</span>
                    )}
                </div>
                
                {isAdmin && (
                    <div className="absolute right-0">
                        {isEditingName ? (
                            <button 
                                onClick={handleNameChange}
                                className="flex items-center justify-center cursor-pointer w-10 h-10 bg-[#3594b6] text-white hover:bg-[#2a3441] mb-2 rounded-full"
                            >  
                                <Check size={25}/>
                            </button> 
                        ) : (
                            <button 
                                onClick={() => setIsEditingName(true)}
                                className="flex items-center justify-center cursor-pointer w-10 h-10 hover:bg-gray-100 mb-2 rounded-full"
                        >
                                <Pencil size={25}/>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Members */}
            <div className="mb-10">
                <h3 className="font-semibold mb-2 text-lg text-center">Members</h3>
                <div className="mt-5">
                    { /* Add members button*/ }
                    {isAdmin && (
                        <button onClick={() => setStep("add")} className="flex items-center p-3 rounded-md shadow-sm bg-[#3594b6] hover:bg-[#2a3441] cursor-pointer hover:">
                            {/* Icon */}
                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center">
                                <FaUserPlus className="text-xl text-[#3594b6]"/>
                            </div>  
                                <span className="text-white mx-5">Add Members</span>
                        </button>
                    )}

                    {chat.members.map(member => {
                        const memberIsAdmin = String(member._id) === String(chat.groupAdmin);

                        return (
                            <div key={member._id} className="flex items-center p-3 rounded-md shadow-sm">
                                {/* Icon */}
                                    <div className="relative h-10 w-10 mr-4 rounded-full bg-gray-200 flex items-center justify-center">
                                        <FaUser className="text-xl text-[#3594b6]"/>

                                        {/* Green dot to show user online, don't want that for groups*/}
                                        {isMemberOnline(member._id) && (
                                            <span className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></span>
                                        )}
                                    </div>
                                        
                                    <span>{member.name}</span>



                                {memberIsAdmin && (
                                    <span className="ml-2 px-1 p-0.5 text-xs bg-gray-200 text-[#3594b6] rounded">Admin</span>
                                )}

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
                        )
                    })}
                </div>
            </div>

                <div className="mb-6">
                    <div className="flex flex-col items-center">

                        {/* Leave group */}
                        <button className="bg-red-500 hover:bg-red-700 font-semibold cursor-pointer h-8 w-sm rounded-md text-white" onClick={handleLeave}>
                            Leave group
                        </button>
                    </div>
                </div>
            {/* if add members is clicked */}
            {isAdmin && step === "add" && (
                //open pop up
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                    <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-4">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="font-semibold text-lg">Add members</h2>
                            <button onClick={() => setStep("type")} className="text-xl cursor-pointer">&times;</button>
                        </div>

                        <div>
                            {/* Search */}
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search users to add to group..."
                                className="w-full border rounded px-3 py-2 mb-3 outline-none focus:border-[#3594b6]"
                            />

                            {loading && <div className="text-sm">Searching...</div>}

                            {/* Results */}
                            <div className="max-h-64 overflow-y-auto">
                                {results.map((u) => (
                                    <button
                                        key={u._id}
                                        onClick={() => toggleMember(u)}
                                        className="w-full text-left px-3 py-2 border-b hover:bg-gray-100 cursor-pointer"
                                    >

                                        <div className="flex items-center justify-between mt-1">
                                            <div className="font-medium">{u.name}</div>

                                            {/* Selection Circle */}
                                            <div
                                                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center
                                                ${selectedMembers.some(m => m._id === u._id) ? "bg-[#3594b6] border-[#3594b6]" : "border-gray-400"}`}
                                            >
                                                {selectedMembers.some(m => m._id === u._id) && (
                                                    <div className="h-2 w-2 bg-white rounded-full" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-sm">{u.email}</div>
                                    
                                    
                                    </button>
                                ))}

                                {/*message to show when there are no users found*/}
                                {!loading && query.trim() && results.length === 0 && (
                                    <div className="text-sm text-center py-4">
                                        No users found
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end mt-5">
                                <button 
                                    disabled={selectedMembers.length < 1}
                                    onClick={handleAddMembers} 
                                    className={`h-10 w-15 text-white rounded-md 
                                    ${selectedMembers.length < 1
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-[#3594b6] hover:bg-[#2a3441]"
                                    }`}
                                    >Add
                                </button>
                            </div> 
                        </div>
                    </div>
                </div>
            )} 
        </div>
    );
};

export default GroupInfo;