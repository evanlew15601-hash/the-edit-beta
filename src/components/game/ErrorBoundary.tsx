import React from 'react';
import { Card } from '@/components/ui/card';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.warn('Render error captured:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-lg w-full p-4">
            <h2 className="text-lg font-medium mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-3">
              The view failed to render. Details below can help with debugging.
            </p>
            <div className="text-xs bg-muted rounded p-3 overflow-auto">
              {String(this.state.error || 'Unknown error')}
            </div>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}