import { createContext, useState, useContext, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { unlockPrivateKey } from "../utils/crypto";

export const EncryptionContext = createContext();

export const EncryptionContextProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [unlockedKey, setUnlockedKey] = useState(null);
    const [isResolvingKey, setIsResolvingKey] = useState(true);

    //to stop the verification modal from popping up after every refresh
    useEffect(() => {
        const restoreSession = async () => {
            if (!user?._id) {
                setIsResolvingKey(false);
                return;
            }

            const savedKeyData = sessionStorage.getItem(`unlocked_key_${user._id}`);
            
            if (savedKeyData) {
                try {
                    const jwk = JSON.parse(savedKeyData);
                    // Import the JWK back into a real CryptoKey object
                    const importedKey = await window.crypto.subtle.importKey(
                        "jwk",
                        jwk,
                        { name: "RSA-OAEP", hash: "SHA-256" },
                        false,
                        ["decrypt"]
                    );
                    setUnlockedKey(importedKey);
                } catch (err) {
                    console.error("Failed to restore session key:", err);
                    sessionStorage.removeItem(`unlocked_key_${user._id}`);
                }
            }
            setIsResolvingKey(false);
        };

        restoreSession();
    }, [user?._id]);

    // function will be called by the Modal when the user types their password
    const initializeEncryption = async (password) => {
        if (!user?.encryptedPrivateKey) return;
        
        try {
            const key = await unlockPrivateKey(
                user.encryptedPrivateKey, 
                password, 
                user.email
            );

            // Save to session storage so it doesn't pop up on refresh
            // Export the key to JWK format so it can be stringified
            const jwk = await window.crypto.subtle.exportKey("jwk", key);
            sessionStorage.setItem(`unlocked_key_${user._id}`, JSON.stringify(jwk));

            console.log("Key successfully unlocked:", key);
            setUnlockedKey(key);
            return { success: true };
        } catch (error) {
            console.error("Decryption failed:", error);
            return { error: "Invalid Security Password" };
        }
    };

    return (
        <EncryptionContext.Provider value={{ 
            unlockedKey, 
            initializeEncryption,
            isResolvingKey 
        }}>
            {children}
        </EncryptionContext.Provider>
    );
};