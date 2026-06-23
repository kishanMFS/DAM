import SpinnerModuleCSS from "../styles/Spinner.module.css";

function Spinner() {
  return (
    <div className={SpinnerModuleCSS.spinnerOverlay}>
      <div className={SpinnerModuleCSS.loader}></div>
    </div>
  );
}

export default Spinner;
