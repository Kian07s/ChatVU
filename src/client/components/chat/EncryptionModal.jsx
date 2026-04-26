import { useState, useContext } from "react";
import { AuthContext } from "../../../Context/AuthContext";
import { setupE2EE } from "../../../utils/crypto";
import { patchRequest, baseUrl } from "../../../utils/services";
import { toast } from "react-hot-toast";
import { EncryptionContext } from "../../../Context/EncryptionContext";

//extra password for verification for new devices
const E2EESetupModal = ({ onClose }) => {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { user, setUser } = useContext(AuthContext);
    const { initializeEncryption } = useContext(EncryptionContext);

    // This determines if user is new or unlocking (returning user)
    const isNewSetup = !user?.publicKey;

    const handleInitialize = async () => {
        if (password.length < 8) {
            return toast.error("Security password must be at least 8 characters.");
        }
        setLoading(true);
        try {
            if (isNewSetup) {
                // --- SCENARIO 1: Brand New Setup ---
                const keys = await setupE2EE(password, user.email);
                const response = await patchRequest(`${baseUrl}/users/setup-e2ee`, {
                    userId: user._id,
                    publicKey: keys.publicKey,
                    encryptedPrivateKey: keys.encryptedPrivateKey
                });

                if (response.error) throw new Error(response.message);

                // Create the updated user object
                const updatedUser = { 
                    ...user, 
                    publicKey: keys.publicKey, 
                    encryptedPrivateKey: keys.encryptedPrivateKey 
                };

                // Save to local storage (This stops the modal from reappearing)
                localStorage.setItem("User", JSON.stringify(updatedUser));

                // Update the state
                setUser(updatedUser);
    
                await initializeEncryption(password, updatedUser);
                toast.success("Security Setup Complete!");
            } else {
                // --- SCENARIO 2: Unlock Existing Keys ---
                const result = await initializeEncryption(password);
                if (result.error) throw new Error(result.error);
                
                toast.success("Identity Verified. Welcome back!");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-2xl">
                <h2 className="text-xl font-bold text-[#3594b6] mb-2">
                    {isNewSetup ? "Secure Medical Chats" : "Verify Your Identity"}
                </h2>
                <p className="text-sm mb-4">
                    {isNewSetup 
                        ? "Set a Security Password. This is different from your login password. It provides encryption so only you can access the medical data within this account. You will be required to provide this password every time you log into this account." 
                        : "Enter your Security Password to unlock your chats."
                    }
                    
                </p>
                
                <input 
                    type="password" 
                    placeholder="Enter Security Password"
                    className="w-full p-2 border rounded mb-4 outline-[#3594b6]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <div className="flex justify-end gap-2">
                    <button 
                        onClick={handleInitialize}
                        disabled={loading}
                        className="px-4 py-2 bg-[#3594b6] text-white rounded hover:bg-[#2a7a96] disabled:bg-gray-400"
                    >
                        {loading ? "Processing..." : isNewSetup ? "Setup Encryption" : "Unlock Account"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default E2EESetupModal;