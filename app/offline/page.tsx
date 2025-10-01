'use client';

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">You&apos;re Offline</h1>
        <p className="text-muted-foreground mb-6">
          It looks like you&apos;ve lost your internet connection.
          Some features may be limited while offline.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>

          <Button
            onClick={() => window.location.href = '/'}
            className="w-full"
            variant="outline"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2 text-sm">What You Can Do Offline:</h3>
          <ul className="text-xs text-muted-foreground space-y-1 text-left">
            <li>• View recently accessed businesses</li>
            <li>• Access saved companies and lists</li>
            <li>• Review cached search results</li>
            <li>• Browse downloaded reports</li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Your data will sync automatically when you&apos;re back online
        </p>
      </Card>
    </div>
  );
}