import React from "react";

type propsType = {
  children: React.ReactNode;
  onError?: (error: Error) => void;
};

type stateType = {
  hasError: boolean;
  error: Error | null;
};

class GlobalErrorBoundary extends React.Component<propsType, stateType> {
  constructor(props: propsType) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (window.location.pathname === "/error") return;
    setTimeout(() => {
      if (this.props.onError) {
        this.props.onError(error);
      }
    }, 0);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
