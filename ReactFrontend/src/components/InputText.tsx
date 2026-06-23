import InputTextModuleCSS from "../styles/InputText.module.css";

type InputTextProps = {
  inputName: string;
  inputValue: string;
  onInputChange: (name: string, value: string) => void;
  errorMessage: string;
};

function InputText({
  inputName,
  inputValue,
  onInputChange,
  errorMessage,
}: InputTextProps) {
  return (
    <div className={InputTextModuleCSS.inputTextContainer}>
      <input
        id={`${inputName}`}
        name={inputName}
        type="text"
        placeholder=""
        value={inputValue}
        onChange={(e) => onInputChange(inputName, e.target.value)}
      />
      {errorMessage && <span className="error-message">{errorMessage}</span>}
    </div>
  );
}

export default InputText;
