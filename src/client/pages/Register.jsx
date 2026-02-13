import { useContext, useState } from "react";
import { AuthContext } from "../../Context/AuthContext";
import { IoEye, IoEyeOff } from "react-icons/io5";


const Register = () => {

    const {registerInfo, updateRegisterInfo, registerUser, registerError, isRegisterLoading} = useContext(AuthContext);
    const [showPassword, setShowPassword] = useState(false);


    return (
        <form className="flex flex-col mt-12 ml-12" onSubmit={(e) => {
            e.preventDefault();
            registerUser();
        }}>
            <div className="text-4xl font-extrabold mb-12 text-[#3594b6]">Register</div>
            <div>Full Name:</div>
            <input className="border-b-2 border-[#8a8b8c] w-80 outline-none py-1 focus:border-[#3594b6]" type="text" value={registerInfo.name} onChange={(e) => updateRegisterInfo({...registerInfo, name: e.target.value})}/>
            
            <div className="mt-8">Email:</div>
            <input className="border-b-2 border-[#8a8b8c] w-80 outline-none py-1 focus:border-[#3594b6]" type="text" value={registerInfo.email} onChange={(e) => updateRegisterInfo({...registerInfo, email: e.target.value})}/>

            <div className="mt-8">Password:</div>
            <div className="relative w-80">
                <input className="border-b-2 border-[#8a8b8c] w-80 outline-none py-1 focus:border-[#3594b6]" type={showPassword ? "text" : "password"} value={registerInfo.password} onChange={(e) => updateRegisterInfo({...registerInfo, password: e.target.value})}/>
                <button type="button" className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                </button>
            </div>
            

            <p className="text-[#8a8b8c] text-sm mt-1">
                At least 8 characters, mix of uppercase, lowercase, number & symbol
            </p>

            <button type="submit" disabled={isRegisterLoading} className="bg-[#3594b6] mt-12 w-32 border border-[#8a8b8c] rounded-md py-1 text-white cursor-pointer hover:bg-[#2a3441]">{isRegisterLoading ? "Registering..." : "Register"}</button>

            {registerError && (
                <div className="mt-6 w-80 bg-red-100 text-red-800 border border-red-400 rounded-md p-3 text-center font-medium shadow-sm">
                    {registerError}
                </div>
            )}
        </form>
    );
};

export default Register;