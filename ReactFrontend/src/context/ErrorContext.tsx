import React, { createContext, useState } from "react";

type ErrorContextType = {
  errorMessage: string;
  showErrorMessage: (msg: string) => void;
  closeError: () => void;
};
// | null

type childrenType = {
  children: React.ReactNode;
};

const ErrorContext = createContext<ErrorContextType>({} as ErrorContextType);

export const ErrorContextProvider = ({ children }: childrenType) => {
  const [errorMessage, setErrorMessage] = useState<string>("");

  const showErrorMessage = (msg: string) => setErrorMessage(msg);
  const closeError = () => setErrorMessage("");

  return (
    <ErrorContext.Provider
      value={{ errorMessage, showErrorMessage, closeError }}
    >
      {children}
    </ErrorContext.Provider>
  );
};

export { ErrorContext };
