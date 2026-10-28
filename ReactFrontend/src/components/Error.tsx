import ErrorModuleCSS from "../styles/Error.module.css";

interface ErrorType {
  message: string;
  onClose: () => void;
}

const Error = ({ message = "An error occurred", onClose }: ErrorType) => {
  return (
    <>
      {message && (
        <div
          className={ErrorModuleCSS.errorContainer}
          role="alert"
          aria-live="assertive"
        >
          <div className={ErrorModuleCSS.errorMessageArea}>
            <span>{message}</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close error message"
              className={ErrorModuleCSS.errorBtn}
            >
              <span aria-hidden="true">x</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Error;
