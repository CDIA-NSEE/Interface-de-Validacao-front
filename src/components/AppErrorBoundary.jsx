import { Component } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleRetry = () => {
    this.props.onRetry();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-svh place-items-center bg-muted/30 p-4">
        <Card className="w-full max-w-md" role="alert">
          <CardHeader>
            <CardTitle>Não foi possível carregar esta tela</CardTitle>
            <CardDescription>
              A aplicação pode ter sido atualizada ou a conexão foi interrompida.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={this.handleRetry} type="button">
              Recarregar aplicação
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
}
