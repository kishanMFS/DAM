import ErrorModuleCSS from "../styles/Error.module.css";

interface ErrorType {
  message: string;
  onClose: () => void;
}

const Error = ({ message = "An error occurred", onClose }: ErrorType) => {
  return (
    <>
      {message && (
        <div className={ErrorModuleCSS.errorContainer}>
          <div className={ErrorModuleCSS.errorMessageArea}>
            <span>{message}</span>
            <button onClick={onClose} className={ErrorModuleCSS.errorBtn}>
              x
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Error;
