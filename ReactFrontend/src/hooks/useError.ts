import { useContext } from "react";
import { ErrorContext } from "../context/ErrorContext";

function useErrorContext() {
  const useErrorContext = useContext(ErrorContext)!; // ! ensure that the value returned by useContext is not null at any point in time. It tells TypeScript that we are confident that the context will always have a value when accessed.

  if (!useErrorContext) {
    throw new Error("useErrorContext must be used within ErrorContextProvider");
  }

  return useErrorContext;
}

export default useErrorContext;
