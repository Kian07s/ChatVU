import { useContext, useState } from "react";
import { AuthContext } from "../../Context/AuthContext";
import { IoEye, IoEyeOff } from "react-icons/io5";
import image from "../../assets/image.png";

const Login = () => {

    const {loginUser,loginError, loginInfo, updateLoginInfo, isLoginLoading} = useContext(AuthContext);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex h-screen">
            <div className="w-1/3 flex justify-center items-center border-r p-5">
                <img src={image} alt="TeleVu Logo" className="h-auto"/>
            </div>

            <form className="w-2/3 flex flex-col ml-12 justify-center items-center" onSubmit={(e) => {
                e.preventDefault();
                loginUser();
            }}>
                <div className="text-4xl font-extrabold mb-12 text-[#3594b6]">Login</div>
                <div>Email:</div>
                <input className="border-b-2 border-[#8a8b8c] w-80 outline-none py-1 focus:border-[#3594b6]" type="text" onChange={(e) => updateLoginInfo({...loginInfo, email: e.target.value})}/>
                    <div className="mt-8">Password:</div>
                    <div className="relative w-80">
                <input className="border-b-2 border-[#8a8b8c] w-80 outline-none py-1 focus:border-[#3594b6]" type={showPassword ? "text" : "password"} onChange={(e) => updateLoginInfo({...loginInfo, password: e.target.value})}/>
                {/*reveal password button*/}
                <button type="button" className="absolute right-0 top-1/2 transform -translate-y-1/2 hover:text-[#5a5b5c]" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}</button>
                </div>
            

            <button type="submit" disabled={isLoginLoading} className="bg-[#3594b6] mt-12 w-32 border border-[#8a8b8c] rounded-md py-1 text-white cursor-pointer hover:bg-[#2a3441]">{isLoginLoading ? "Logging In..." : "Login"}</button>

                {loginError && (
                    <div className="mt-6 w-80 bg-red-100 text-red-800 border border-red-400 rounded-md p-3 text-center font-medium shadow-sm">
                        {loginError}
                    </div>
                )}
            </form>

        </div>
    )
}

export default Login;