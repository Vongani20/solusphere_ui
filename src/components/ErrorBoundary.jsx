import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface p-6">
          <div className="card max-w-lg space-y-3 p-6">
            <h1 className="text-lg font-bold text-heading">Something went wrong</h1>
            <p className="text-sm text-muted">
              This page hit an unexpected error. Try refreshing. If the problem continues, log out
              and sign in again.
            </p>
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {this.state.error?.message || "Unknown error"}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
