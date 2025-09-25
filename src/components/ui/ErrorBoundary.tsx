import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    try {
      // Attempt soft reload
      window.location.reload();
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-2xl mx-auto">
            <Card className="p-6">
              <h1 className="text-2xl font-light mb-2">Something went wrong</h1>
              <p className="text-sm text-muted-foreground mb-4">
                An error occurred while rendering this screen. Try reloading. If it persists, please send the error below.
              </p>
              <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-56 border border-border">
                {String(this.state.error)}
              </pre>
              <div className="mt-4">
                <Button variant="action" onClick={this.handleReload}>
                  Reload
                </Button>
              </div>
            </Card>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}