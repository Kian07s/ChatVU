// Helper to convert ArrayBuffer to Base64 safely
const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// Helper to convert Base64 to Uint8Array safely
const base64ToUint8Array = (base64) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// Convert a password into a strong encryption key
const deriveMasterKey = async (password, salt) => {
    const encoder = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
};

// Main setup function: Generates keys and encrypts the private one
export const setupE2EE = async (securityPassword, userEmail) => {
    // Generate the RSA Key Pair (The Padlock and the Key)
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    // Export keys to strings so we can move them around
    const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyString = arrayBufferToBase64(publicKeyBuffer);

    const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    // Encrypt the Private Key using the Security Password
    const masterKey = await deriveMasterKey(securityPassword, userEmail);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Random "Salt" for AES
    const encryptedPrivateKey = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        masterKey,
        privateKeyBuffer
    );

    // Combine IV and Key into one Base64 string
    const combined = new Uint8Array(iv.length + encryptedPrivateKey.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedPrivateKey), iv.length);

    // Return everything needed for the Database
    return {
        publicKey: publicKeyString,
        // We combine the IV and the Encrypted Key into one string for easy storage
        encryptedPrivateKey: arrayBufferToBase64(combined.buffer)
    };
};


// Unlocks the Private Key using the Security Password.
export const unlockPrivateKey = async (encryptedData, password, userEmail) => {
    // 1. Convert the Base64 string back into binary numbers
    const binaryData = base64ToUint8Array(encryptedData);
    
    // 2. Extract the IV (first 12 bytes) and the Key (the rest)
    const iv = binaryData.slice(0, 12);
    const encryptedKey = binaryData.slice(12);

    // 3. Turn the password into the Master Key
    const masterKey = await deriveMasterKey(password, userEmail);

    // 4. Decrypt the Private Key buffer
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        masterKey,
        encryptedKey
    );

    // 5. Turn that buffer back into a usable RSA Key object
    return await window.crypto.subtle.importKey(
        "pkcs8",
        decryptedBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
    );
};

/**
 * Encrypts a message for a list of recipients (Works for 1-on-1 and Groups).
 * @param {string} plainText - The message to hide.
 * @param {Array} recipients - Array of user objects { _id, publicKey }.
 */
export const encryptMessage = async (plainText, recipients) => {
    if (!recipients || recipients.length === 0) return null;

    const encoder = new TextEncoder();

    // Create a "One-Time Use" AES Key for this specific message
    const messageKey = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );

    // Encrypt the actual text with that AES Key
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        messageKey,
        encoder.encode(plainText)
    );

    // Export the AES Key so we can "wrap" it for each person
    const exportedKey = await window.crypto.subtle.exportKey("raw", messageKey);

    // Create the "Key Bundle" (One encrypted copy of the AES key for each member)
    const keyBundle = await Promise.all(recipients.map(async (member) => {
        if (!member.publicKey) {
            console.error(`Encryption failed for member ${member._id || member}: Missing Public Key`);
            return null;
        }

        try {
            const pubKey = await window.crypto.subtle.importKey(
                "spki", base64ToUint8Array(member.publicKey), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]
            );

            const wrappedKey = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                pubKey,
                exportedKey
            );

            return {
                recipientId: member._id,
                encryptedKey: arrayBufferToBase64(wrappedKey)
            };
        } catch (e) {
            console.error(`Failed to encrypt for member ${member._id}`);
            return null;
        }
    }));

    // Filter out the nulls
    const finalBundle = keyBundle.filter(k => k !== null);
    console.log("Final Bundle Size:", finalBundle.length);

    return {
        scrambledText: arrayBufferToBase64(encryptedBuffer),
        iv: arrayBufferToBase64(iv),
        keyBundle: finalBundle
    };
};

//encryption for files
export const encryptFile = async (file, recipients) => {
    const arrayBuffer = await file.arrayBuffer();

    // Generate a one-time key for this file
    const fileKey = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
    );

    // Encrypt the file data
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv }, fileKey, arrayBuffer
    );

    // 3. Wrap the key for recipients (Same logic as messages)
    const exportedKey = await window.crypto.subtle.exportKey("raw", fileKey);
    const keyBundle = await Promise.all(recipients.map(async (member) => {
        if (!member.publicKey) return null;
        const pubKey = await window.crypto.subtle.importKey(
            "spki", base64ToUint8Array(member.publicKey), 
            { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]
        );
        const wrappedKey = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKey, exportedKey);
        return { recipientId: member._id, encryptedKey: arrayBufferToBase64(wrappedKey) };
    }));

    return {
        encryptedBlob: new Blob([encryptedBuffer]), 
        iv: arrayBufferToBase64(iv),
        keyBundle: keyBundle.filter(k => k !== null)
    };
};

//file decryption
export const decryptFile = async (encryptedBlob, fileIv, fileKeyBundle, unlockedKey, userId) => {
    // Safety check: if the bundle is missing, don't proceed
    if (!fileKeyBundle || !Array.isArray(fileKeyBundle)) {
        console.error("Decryption Error: fileKeyBundle is missing or not an array", fileKeyBundle);
        throw new Error("File key bundle is missing");
    }

    //find the key
    const myKeyEntry = fileKeyBundle.find(k => String(k.recipientId) === String(userId));
    if (!myKeyEntry) throw new Error("No file key for this user");

    // Unlock the File's AES Key using Private Key
    const encryptedAESBuffer = base64ToUint8Array(myKeyEntry.encryptedKey);
    const decryptedAESBuffer = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        unlockedKey,
        encryptedAESBuffer
    );

    const fileKey = await window.crypto.subtle.importKey(
        "raw", decryptedAESBuffer, { name: "AES-GCM" }, false, ["decrypt"]
    );

    // Decrypt the actual file bytes
    const iv = base64ToUint8Array(fileIv);
    const encryptedArrayBuffer = await encryptedBlob.arrayBuffer();
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        fileKey,
        encryptedArrayBuffer
    );

    // Return someyjing that the browser can actually display
    return new Blob([decryptedBuffer]);
};