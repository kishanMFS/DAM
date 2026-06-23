import type React from "react";
import ModalModuleCSS from "../../styles/Modal.module.css";

interface ModalType {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

function Modal({
  title = "default modal title",
  modalOpen,
  setModalOpen,
  children,
  footer,
}: ModalType) {
  function handleOnClose() {
    setModalOpen(false);
  }

  return (
    <div>
      {modalOpen && (
        <div className={ModalModuleCSS.modalContainer}>
          <div className={ModalModuleCSS.modalOverlay}></div>
          <div className={ModalModuleCSS.modal}>
            <div className={ModalModuleCSS.modalContent}>
              <div className={ModalModuleCSS.modalHeader}>
                <h2>{title}</h2>
                <div
                  className={ModalModuleCSS.closeBtn}
                  onClick={handleOnClose}
                >
                  &times;
                </div>
              </div>
              <div className={ModalModuleCSS.modalBody}>{children}</div>
              <div className={ModalModuleCSS.modalFooter}>
                <div className={ModalModuleCSS.modalFooterBtn}>{footer}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Modal;
