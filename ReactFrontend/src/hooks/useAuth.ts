import { useContext } from "react";
import { UserAuthContext } from "../context/authenticationContext";

function useAuth() {
  const authContext = useContext(UserAuthContext)!; // ! ensure that the value returned by useContext is not null at any point in time. It tells TypeScript that we are confident that the context will always have a value when accessed.

  if (!authContext) {
    throw new Error("useAuth must be used within UserAuthContextProvider");
  }

  return authContext;
}

export default useAuth;
