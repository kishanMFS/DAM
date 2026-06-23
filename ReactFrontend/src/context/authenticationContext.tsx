import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUserService, verifyUserService } from "../services/authAPI";
import useXHR from "../hooks/useXHR";

type UserAuthContextType = {
  isLoggedIn: boolean;
  loginUser: () => void;
  logoutUser: () => void;
};
type childrenType = {
  children: React.ReactNode;
};

const UserAuthContext = createContext<UserAuthContextType | null>(null);

export const UserAuthContextProvider = ({ children }: childrenType) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const { callApi } = useXHR();

  const loginUser = () => {
    // localStorage.setItem("jwtToken", jwtToken);
    setIsLoggedIn(true);
    navigate("/projects");
  };
  const logoutUser = async () => {
    await logoutUserService({
      callApi,
      onProgress: () => {},
    });

    setIsLoggedIn(false);
    navigate("/login");
  };

  // const validateUser = async () => {
  //   const verifyUserResponse = await verifyUserService({
  //     callApi,
  //     onProgress: () => {}
  //   });
  //   setIsLoggedIn(verifyUserResponse.isValid);
  // }

  useEffect(() => {
    // void validateUser();

    let mounted = true;

    const validateUser = async () => {
      try {
        const verifyUserResponse = await verifyUserService({
          callApi,
          onProgress: () => {},
        });

        if (mounted) {
          setIsLoggedIn(verifyUserResponse.isValid);
        }
      } catch {
        if (mounted) {
          setIsLoggedIn(false);
        }
      }
    };

    void validateUser();

    return () => {
      mounted = false;
    };
  }, [callApi]);

  return (
    <UserAuthContext.Provider value={{ isLoggedIn, loginUser, logoutUser }}>
      {children}
    </UserAuthContext.Provider>
  );
};

export { UserAuthContext };
