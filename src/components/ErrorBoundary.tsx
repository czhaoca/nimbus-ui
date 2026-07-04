"use client";

import { Component, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-8 min-h-screen bg-background text-foreground">
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertTriangle className="size-4" />
            <AlertTitle>Nimbus failed to load</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">An unexpected error occurred:</p>
              <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm max-h-72">
                {this.state.error?.message ?? "Unknown error"}
                {"\n\n"}
                {this.state.error?.stack ?? ""}
              </pre>
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-4"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return this.props.children;
  }
}
