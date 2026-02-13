//file where http requests are performed
export const baseUrl = "http://localhost:5050/api";

//updating user data
export const postRequest = async(url, body) => {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type" : "application/json"
        },
        body,
        credentials: "include",
    });

    let data;

    try {
        data = await response.json();
        //error check and message
        if (!response.ok) {
            return { error: true, message: data?.message || String(data) || "Something went wrong" };
        }

        return data;
    } catch(error) {
        return { error: true, message: error.message || "Network or server error" };
    }
    
};

//get request
export const getRequest = async(url) => {

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            return {
              error: true,
              message: data?.message || "An error occurred"
            };
        }
    
        return data;
    } catch (error) {
        return {
            error: true,
            message: error.message || "Network error"
        };
    }
};