//auto decrypt all files on verification
import { useEffect, useState, useContext } from "react";
import { EncryptionContext } from "../../../Context/EncryptionContext";
import { AuthContext } from "../../../Context/AuthContext";
import { decryptFile } from "../../../utils/crypto";
import { Loader2 } from "lucide-react";

const SecureFileDisplay = ({ fileUrl, fileInfo }) => {
    const [decryptedUrl, setDecryptedUrl] = useState(null);
    const [error, setError] = useState(false);
    const { unlockedKey } = useContext(EncryptionContext);
    const { user } = useContext(AuthContext);

    useEffect (() => {
        if (!fileUrl || !fileInfo || !unlockedKey) return;

        const processFile = async () => {
            try {
                // Fetch the "Scrambled" file from the server
                const response = await fetch(fileUrl);
                const encryptedBlob = await response.blob();

                // Decrypt it locally in the browser
                const decryptedData = await decryptFile(
                    encryptedBlob,
                    fileInfo.fileIv,
                    fileInfo.fileKeyBundle,
                    unlockedKey,
                    user._id
                );

                const fileBlob = new Blob([decryptedData], { type: fileInfo.type });

                // Create a temporary local URL for the <img> tag
                const localUrl = URL.createObjectURL(fileBlob);
                setDecryptedUrl(localUrl);
            } catch (err) {
                console.error("File Decryption Failed:", err);
                setError(true);
            }
        };

        processFile();

        // Cleanup the local URL when the component unmounts to save memory
        return () => {
            if (decryptedUrl) URL.revokeObjectURL(decryptedUrl);
        };
    },[fileUrl, fileInfo, unlockedKey]);

    if (error) return <span className="text-red-500 text-xs">Failed to load secure file</span>;
    if (!decryptedUrl) return <Loader2 className="animate-spin text-gray-400" size={20} />;

   return (
        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
            {fileInfo.type.startsWith("image/") ? (
                <a href={decryptedUrl} target="_blank" rel="noreferrer">
                    <img src={decryptedUrl} alt="Decrypted" className="max-w-full h-auto object-cover" />
                </a>
            ) : (
                <a href={decryptedUrl} download={fileInfo.name} className="flex items-center gap-2 p-2 bg-blue-50 text-blue-600 hover:underline">
                    Download {fileInfo.name}
                </a>
            )}
        </div>
    );
}; 

export default SecureFileDisplay;