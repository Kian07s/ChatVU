import { useEffect, useState } from "react";
import { baseUrl, getRequest } from "../../utils/services";

export const useFetchRecipientUser = ({chat, user}) => {
    const [recipientUser, setRecipientUser] = useState(null);

    const recipientId = chat?.members?.find((member) => member._id !== user._id)?._id;

    useEffect(() => {
        if (!recipientId) {
            setRecipientUser(null);
            return;
        }
        
        const getUser = async() => {

            const response = await getRequest(`${baseUrl}/users/find/${recipientId}`);

            if (!response || response.error) {
                console.error("Failed to fetch recipient user:", response);
                return;
            }

            setRecipientUser(response)
        };

        getUser();
    }, [recipientId]);

    return {recipientUser};
};