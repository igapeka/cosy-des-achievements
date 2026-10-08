import { Component, type ReactNode } from "react";
import ErrorPage from "../pages/ErrorPage/ErrorPage";

type State = { hasError: boolean };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // Keep render failures out of logs; the user gets the shared, action-free page.
  }

  render() {
    return this.state.hasError ? (
      <ErrorPage message="Не удалось открыть экран приложения." />
    ) : (
      this.props.children
    );
  }
}
