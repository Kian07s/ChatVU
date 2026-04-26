import { useContext, useState, useEffect } from "react";
import { EncryptionContext } from "../../../Context/EncryptionContext";
import { AuthContext } from "../../../Context/AuthContext";
import { toast } from "react-hot-toast";

const DecryptText = ({ text, encryptionMeta, onFileDecrypted }) => {
    const { unlockedKey } = useContext(EncryptionContext);
    const { user } = useContext(AuthContext);
    const [decrypted, setDecrypted] = useState("Decrypting...");

    useEffect(() => {
        const performDecryption = async() => {
            // If there is no metadata, it's an old unencrypted message
            if (!encryptionMeta || (typeof encryptionMeta === 'string' && encryptionMeta === "{}")) {
                setDecrypted(text);
                return;
            }

            try {
                const meta = typeof encryptionMeta === 'string' ? JSON.parse(encryptionMeta) : encryptionMeta;

                if (!meta.iv || !meta.keyBundle) {
                    setDecrypted(text);
                    return;
                }
                
                console.log("My User ID:", user._id);
                console.log("Available IDs in Bundle:", meta.keyBundle.map(k => k.recipientId));

                // 1. Find the encrypted AES key meant for ME
                const myKeyEntry = meta.keyBundle.find(k => String(k.recipientId) === String(user._id));
                if (!myKeyEntry) throw new Error("No key found for this user");

                // 2. Use our Private Key to unlock the AES "Session Key"
                const encryptedAESBuffer = Uint8Array.from(atob(myKeyEntry.encryptedKey), c => c.charCodeAt(0));
                const decryptedAESBuffer = await window.crypto.subtle.decrypt(
                    { name: "RSA-OAEP" },
                    unlockedKey,
                    encryptedAESBuffer
                );

                const sessionKey = await window.crypto.subtle.importKey(
                    "raw", decryptedAESBuffer, { name: "AES-GCM" }, false, ["decrypt"]
                );

                // 3. Use the Session Key to unlock the Message Text
                const iv = Uint8Array.from(atob(meta.iv), c => c.charCodeAt(0));
                const textBuffer = Uint8Array.from(atob(text), c => c.charCodeAt(0));
                
                const decryptedBuffer = await window.crypto.subtle.decrypt(
                    { name: "AES-GCM", iv },
                    sessionKey,
                    textBuffer
                );

                // Unbox the JSON payload to show messages as actual text
                const decodedText = new TextDecoder().decode(decryptedBuffer);

                try {
                    const parsedData = JSON.parse(decodedText);

                    // If it's JSON format, show just the body
                    if (parsedData && typeof parsedData === 'object' && 'body' in parsedData) {
                        setDecrypted(parsedData.body);

                        //send file
                        if (parsedData.fileInfo && onFileDecrypted) {
                            onFileDecrypted(parsedData.fileInfo);
                        }
                    } else {
                        // Fallback if it's not the JSON format we expected
                        setDecrypted(decodedText);
                    }
                } catch(error) {
                    // If it's a simple string (not JSON), show it directly
                    setDecrypted(decodedText);
                }
            } catch (error) {
                console.error("Decryption error:", error);
                setDecrypted("[Encrypted Content]");
            }
        };

        performDecryption();
    }, [text, encryptionMeta, unlockedKey, user._id]);

    return <span>{decrypted}</span>;
};

export default DecryptText;