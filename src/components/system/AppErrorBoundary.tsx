import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  errorMessage: string;
};

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    errorMessage: "",
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App failed to load", error, errorInfo);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <main className="app" dir="rtl">
          <section className="section">
            <div className="sectionTitle">
              <h2>שגיאת הגדרות</h2>
              <span>האפליקציה לא הצליחה להיטען</span>
            </div>

            <div className="notice errorNotice">
              <strong>Firebase configuration is incomplete</strong>
              <span>{this.state.errorMessage}</span>
            </div>

            <div className="notice">
              בדוק שקובץ ‎.env‎ נמצא בשורש הפרויקט ושכל משתני Firebase קיימים גם ב־Netlify.
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
