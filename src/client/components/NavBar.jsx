import { Link } from "react-router-dom";
import { useState, useContext } from "react";
import { FaUserCircle } from "react-icons/fa";
import { AuthContext } from "../../Context/AuthContext";

const NavBar = () => {
    //know if logged in or not
    const { user } = useContext(AuthContext);
    const loggedIn = !!user;
    //open/close dropdown
    const [dropDownOpen, setDropDownOpen] = useState(false);

    const signOut = () => {
        localStorage.removeItem("User");
        window.location.reload();
    };

    return (
    <div className="bg-[#3594b6] h-16 w-full flex items-center">
        <div className="flex-1"></div>

        <div className="text-4xl flex justify-center items-center">
            <span className="font-thin">Chat</span>
            <span className="font-extrabold text-white">VU</span>
        </div>
        <div className="flex-1 flex justify-end space-x-6 mr-5">
            {!loggedIn ? (
                <div className="flex space-x-6">
                    <Link to="/login" className="text-white cursor-pointer hover:underline">Login</Link>
                    <Link to="/register" className="text-white cursor-pointer hover:underline">Register</Link>
              </div>
            ) : (
                <div className="relative">
                    <button
                        onClick={() => setDropDownOpen(!dropDownOpen)}
                        className="text-white text-2xl focus:outline-none cursor-pointer"
                    >
                        <FaUserCircle />
                    </button>

                    {dropDownOpen && (
                        <div className="z-10 absolute right-0 mt-2 w-48 bg-[#3594b6] rounded-md shadow-lg text-white">
                            <div className="px-4 py-2 border-b border-[#5a5b5c] text-sm">
                                <span className="block">Signed in as</span>
                                <span className="block font-semibold truncate"></span>
                                {user?.name || user?.email}
                            </div>

                            <button
                                onClick={signOut}
                                className="w-full text-left px-4 py-2 hover:bg-[#2a3441] cursor-pointer"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            )}
      </div>
    </div>
    );
};
 
export default NavBar;