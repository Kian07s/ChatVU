//useState allows storing search input and bringing results
//useEffect runs the search
//useContext accesses logged in user info and chat list
import { useEffect, useState, useContext } from "react";
//https logic. avoids repeating fetch code and makes error handling consistent
import { baseUrl, getRequest, postRequest } from "../../../utils/services";
//identifies user
import { AuthContext } from "../../../Context/AuthContext";
//updates chat list
import { ChatContext } from "../../../Context/ChatContext";
import { FaUser, FaUsers } from "react-icons/fa";

//closes overlay when chat is created
const NewChat = ({ onClose, setSelectedChat, setView }) => {
    //identfy user
    const { user } = useContext(AuthContext);
    //inserts new chat into list without refetching
    const { addChat, userChats } = useContext(ChatContext);

    //what the user types and being able to update it using useState
    const [query, setQuery] = useState("");
    //search results (list of users)
    const [results, setResults] = useState([]);
    //while the results are loading
    const [loading, setLoading] = useState(false);
    //for chat format ui switch
    const [step, setStep] = useState("type");
    //group chat members selection
    const [selectedMembers, setSelectedMembers] = useState([]);
    //group name change
    const [groupName, setGroupName] = useState("");
    //stop chat creation after first input
    const [isCreatingChat, setIsCreatingChat] = useState(false);


    const memberNames = selectedMembers.map(m => m.name).join(", ");

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
                setResults(response.filter(u => u._id !== user._id));
            }
        };
        searchUsers();
    }, [query, user._id]);

    //Creating a chat. happens when logged in user clicks another user to chat with
    const createChat = async (recipientId) =>  {
        //if chat is already being created, stop
        if (isCreatingChat) {
            return
        }

        setIsCreatingChat(true);

         //check if dm exists
         const existingChat = userChats?.find(c =>
            !c.isGroupChat &&
            c.members.some(m => m._id === recipientId)
        );

        if (existingChat) {
            setSelectedChat(existingChat);
            setView("messages");
            setIsCreatingChat(false);
            onClose();
            return;
        }
        
        const response = await postRequest(`${baseUrl}/chats`,
            JSON.stringify({
                members: [user._id, recipientId],
                isGroupChat: false
            })
        );

        setIsCreatingChat(false);

        if (response?.error) {
            return;
        }

        addChat(response);
        setSelectedChat(response);
        setView("messages");
        onClose();
    };

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

    const createGroup = async () => {
        if (isCreatingChat) {
            return;
        }

        setIsCreatingChat(true);

        try {
            const body = {
                groupName: groupName.trim(),
                members: [user._id, ...selectedMembers.map(m => m._id)],
                isGroupChat: true,
            };

            const response = await postRequest(
                `${baseUrl}/chats`,
                JSON.stringify(body)
            );

            setIsCreatingChat(false);
            
            if (response?.error) {
                console.error("Failed to create group:", response);
                return;
            }

            addChat(response);

            //resetting info
            setGroupName("");
            setSelectedMembers([]);
            setStep("type");
            onClose();

        } catch (error) {
            console.error("Erroe creating group chat:", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-semibold text-lg">Start a new chat</h2>
                    <button onClick={onClose} className="text-xl cursor-pointer">&times;</button>
                </div>

                {/*Body (will change based on chat type)*/}
                {/*if the type of chat is not chosen, show options*/}
                {step === "type" && (
                    <div>
                        <button onClick={() => setStep("dm")} className="w-full h-20 border border-b-0 cursor-pointer flex justify-center items-center hover:bg-gray-100">
                            <FaUser className="text-2xl m-2 text-[#3594b6]" />1 on 1 Chat
                        </button>
                        <button onClick={() => setStep("group-members")} className="w-full h-20 border cursor-pointer flex justify-center items-center hover:bg-gray-100">
                            <FaUsers className="text-3xl m-2 text-[#3594b6]" />Group Chat
                        </button>
                    </div>
                )}
                {/*if 1 on 1 chat is chosen, show corresponding ui*/}
                {step === "dm" && (
                    <div>
                        {/* Search */}
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search users to chat with..."
                            className="w-full border rounded px-3 py-2 mb-3 outline-none focus:border-[#3594b6]"
                        />

                        {loading && <div className="text-sm">Searching...</div>}

                        {/* Results */}
                        <div className="max-h-64 overflow-y-auto">
                            {results.map((u) => (
                                <button
                                    key={u._id}
                                    //disabling button when already creating
                                    disabled={isCreatingChat}
                                    onClick={() => createChat(u._id)}
                                    className={`w-full text-left px-3 py-2 border-b transition-all ${isCreatingChat ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 cursor-pointer"}`}
                                >
                                    <div className="font-medium">{u.name}</div>
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
                        <button onClick={() => setStep("type")} className="h-10 w-15 cursor-pointer hover:bg-[#2a3441] bg-[#3594b6] text-white rounded-md mt-5">Back</button>
                    </div>
                )}

                {/*if group chat is chosen, show corresponding ui*/}
                {step === "group-members" && (
                    <div>
                        {/* Search */}
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search users to add to group chat..."
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
                        <div className="flex justify-between mt-5">
                            <button onClick={() => setStep("type")} className="h-10 w-15 cursor-pointer hover:bg-[#2a3441] bg-[#3594b6] text-white rounded-md">Back</button>
                            <button 
                                disabled={selectedMembers.length < 2}
                                onClick={() => setStep("group-creation")} 
                                className={`h-10 w-15 text-white rounded-md 
                                    ${selectedMembers.length < 2
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-[#3594b6] hover:bg-[#2a3441]"
                                    }`}
                               >Next
                            </button>
                        </div>
                        
                    </div>
                )}
                {/*Next Step in group creation, show corresponding ui*/}
                {step === "group-creation" && (
                    <div>
                        {/* Group Name */}
                        <input
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter Group Name..."
                            className="w-full border rounded px-3 py-2 mb-3 outline-none focus:border-[#3594b6]"
                        />

                        <p className="text-sm">
                            Create Group Chat <span className="font-semibold">"{groupName}"</span>
                            {memberNames && (
                                <> with <span className="font-semibold">{memberNames}</span></>
                            )}
                            ?
                        </p>

                        <div className="flex justify-between mt-5">
                            <button onClick={() => setStep("group-members")} className="h-10 w-15 cursor-pointer hover:bg-[#2a3441] bg-[#3594b6] text-white rounded-md">Back</button>
                            <button 
                                disabled={!groupName.trim()}
                                onClick={createGroup} 
                                className={`h-10 w-30 text-white rounded-md 
                                    ${
                                        !groupName.trim() 
                                            ? "bg-gray-400 cursor-not-allowed"
                                            : "bg-[#3594b6] hover:bg-[#2a3441]"
                                    }`}
                               >Create Group
                            </button>
                        </div>

                    </div>
                )}
                
            </div>
        </div>
    );

    
};

export default NewChat;

