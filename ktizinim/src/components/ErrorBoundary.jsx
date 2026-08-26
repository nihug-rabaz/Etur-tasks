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
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="text-center py-10 px-4 bg-rose-50 rounded-2xl border border-rose-100">
          <p className="text-rose-600 font-medium mb-1">אירעה שגיאה בטעינת התוכן</p>
          <p className="text-xs text-rose-400 break-words">{this.state.error?.message || String(this.state.error)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}