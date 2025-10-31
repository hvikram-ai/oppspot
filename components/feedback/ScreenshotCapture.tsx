'use client';

import React, { useState } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScreenshotCaptureProps {
  screenshot: string | null;
  onScreenshotCapture: (screenshot: string | null) => void;
}

export default function ScreenshotCapture({ screenshot, onScreenshotCapture }: ScreenshotCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');

  const captureScreenshot = async () => {
    setIsCapturing(true);
    setError('');

    try {
      // Check if browser supports screenshot API
      if (!('mediaDevices' in navigator) || !('getDisplayMedia' in navigator.mediaDevices)) {
        throw new Error('Screenshot capture is not supported in your browser');
      }

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen' as any,
        },
      });

      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0);

      // Stop the stream
      stream.getTracks().forEach((track) => track.stop());

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/png', 0.8);

      // Check size (max 5MB)
      const sizeInBytes = (dataUrl.length * 3) / 4;
      const maxSize = 5 * 1024 * 1024;

      if (sizeInBytes > maxSize) {
        throw new Error('Screenshot is too large. Maximum size is 5MB.');
      }

      onScreenshotCapture(dataUrl);

    } catch (err) {
      console.error('Screenshot capture error:', err);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permission denied. Please allow screen capture to continue.');
        } else if (err.message.includes('not supported')) {
          setError('Screenshot capture is not supported in your browser. Please use Chrome, Edge, or Firefox.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to capture screenshot. Please try again.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const removeScreenshot = () => {
    onScreenshotCapture(null);
    setError('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Screenshot (Optional)
      </label>

      {screenshot ? (
        <div className="relative border border-gray-300 rounded-md overflow-hidden">
          <img
            src={screenshot}
            alt="Screenshot"
            className="w-full h-auto max-h-96 object-contain"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={removeScreenshot}
              className="shadow-lg"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium shadow-lg">
              <Check className="h-3 w-3 mr-1" />
              Screenshot captured
            </span>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
          <Camera className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={captureScreenshot}
              disabled={isCapturing}
              className="inline-flex items-center"
            >
              {isCapturing ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full" />
                  Capturing...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Screenshot
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Click to capture your screen. This helps us understand the issue better.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Maximum file size: 5MB. Supported format: PNG.
      </p>
    </div>
  );
}
