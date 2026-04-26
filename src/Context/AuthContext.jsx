import { createContext, useCallback, useState, useEffect } from "react";
import { baseUrl, postRequest } from "../utils/services";

export const AuthContext = createContext();

export const AuthContextProvider = ({ children })  => {
    const [user, setUser] = useState(null);
    const [registerError, setRegisterError] = useState(null);
    const [isRegisterLoading, setIsRegisterLoading] = useState(false);
    const [registerInfo, setRegisterInfo] = useState({ name: "", email: "", password: ""});

    const [loginError, setLoginError] = useState(null);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [loginInfo, setLoginInfo] = useState({email: "", password: ""});

    console.log('User', user);
    console.log('registerInfo', registerInfo);
    console.log('registerError', registerError);

    useEffect(() => {
        const storedUser = localStorage.getItem("User");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const updateRegisterInfo = useCallback((info) => {
        setRegisterInfo(info);
    }, []);

    const updateLoginInfo = useCallback((info) => {
        setLoginInfo(info);
    }, []);

    //registering user
    const registerUser = useCallback(async(e) => {
        setIsRegisterLoading(true);
        setRegisterError(null);

        try {
            const response = await postRequest(`${baseUrl}/users/register`, JSON.stringify(registerInfo));

            setIsRegisterLoading(false);

            //error check
            if (response.error) {
                setIsRegisterLoading(false);
                setRegisterError(response.message);
                return;
            }

            //saviing user info to local storage
            localStorage.setItem("User", JSON.stringify(response));
            setUser(response);
            setIsRegisterLoading(false);

        } catch (error) {
            setRegisterError(error.message || "Something went wrong");
            setIsRegisterLoading(false);
        }
        
    }, [registerInfo]);

    const loginUser = useCallback(async(e) => {
        setIsLoginLoading(true);
        setLoginError(null);

        try {
            const response = await postRequest(`${baseUrl}/users/login`, JSON.stringify(loginInfo));

            setIsLoginLoading(false);

            if(response.error) {
                setIsLoginLoading(false);
                setLoginError(response.message);
                return;
            }

            localStorage.setItem("User", JSON.stringify(response));
            setUser(response);
            setIsLoginLoading(false);

        } catch (error) {
            setLoginError(error.message || "Something went wrong");
            setIsLoginLoading(false);
        }
    }, [loginInfo]);

    return (
        <AuthContext.Provider 
            value = {{
                user,
                setUser,
                registerInfo,
                updateRegisterInfo,
                registerUser,
                registerError,
                isRegisterLoading,
                loginUser,
                loginError,
                loginInfo,
                updateLoginInfo,
                isLoginLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};