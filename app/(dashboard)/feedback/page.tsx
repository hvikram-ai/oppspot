'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import ScreenshotCapture from '@/components/feedback/ScreenshotCapture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { FeedbackCategory, FeedbackSubmissionForm } from '@/types/feedback';

const feedbackTypes: {
  value: FeedbackCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: 'bug',
    label: 'Bug Report',
    icon: '🐛',
    description: 'Report an issue or error in oppSpot',
  },
  {
    value: 'feature',
    label: 'Feature Request',
    icon: '✨',
    description: 'Suggest a new feature or capability',
  },
  {
    value: 'improvement',
    label: 'Improvement',
    icon: '📈',
    description: 'Suggest an enhancement to existing features',
  },
  {
    value: 'data_quality',
    label: 'Data Quality',
    icon: '📊',
    description: 'Report issues with business data accuracy',
  },
  {
    value: 'integration',
    label: 'Integration',
    icon: '🔗',
    description: 'Issues or requests related to integrations',
  },
  {
    value: 'performance',
    label: 'Performance',
    icon: '⚡',
    description: 'Report slow loading or performance issues',
  },
  {
    value: 'other',
    label: 'Other',
    icon: '💬',
    description: 'General feedback or question',
  },
];

export default function FeedbackPage() {
  const router = useRouter();
  const [form, setForm] = useState<FeedbackSubmissionForm>({
    type: 'bug',
    title: '',
    description: '',
    screenshot: null,
    is_public: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSubmitStatus('success');
      setReferenceId(data.referenceId);

      // Reset form
      setForm({
        type: 'bug',
        title: '',
        description: '',
        screenshot: null,
        is_public: true,
      });

      // Redirect to board after 3 seconds if public
      if (form.is_public) {
        setTimeout(() => {
          router.push('/feedback/board');
        }, 3000);
      }

    } catch (error) {
      console.error('[Feedback] Submission error:', error);
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = form.title.trim() !== '' && form.description.trim() !== '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Send Feedback</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Help us improve oppSpot by reporting bugs or suggesting new features
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/feedback/board')}
            >
              View Community Board
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {submitStatus === 'success' && (
          <div className="mx-6 mt-6 rounded-md bg-green-50 p-4 border border-green-200">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Feedback submitted successfully!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Thank you for your feedback. We've received your message and will review it shortly.
                  </p>
                  {referenceId && (
                    <p className="mt-2">
                      Reference ID: <strong>{referenceId}</strong>
                    </p>
                  )}
                  {form.is_public && (
                    <p className="mt-2 font-medium">
                      Your feedback has been posted to the community board. Redirecting...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitStatus === 'error' && (
          <div className="mx-6 mt-6 rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Error submitting feedback
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{errorMessage}</p>
                </div>
                <button
                  onClick={(e) => handleSubmit(e as any)}
                  className="mt-3 text-sm text-red-700 hover:text-red-800 underline flex items-center"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Feedback Type */}
          <div>
            <label className="text-base font-medium text-gray-900 block mb-4">
              What type of feedback is this? <span className="text-red-500">*</span>
            </label>
            <RadioGroup
              value={form.type}
              onValueChange={(value) =>
                setForm({ ...form, type: value as FeedbackCategory })
              }
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              {feedbackTypes.map((type) => (
                <div key={type.value} className="flex items-start space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label
                    htmlFor={type.value}
                    className="flex-1 cursor-pointer p-3 border rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-start">
                      <span className="text-2xl mr-2">{type.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              placeholder="Brief summary of your feedback..."
              required
              className="mt-1"
            />
            <p className="mt-2 text-sm text-gray-500">{form.title.length}/200 characters</p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={5000}
              placeholder="Please provide detailed information about your feedback. For bugs, include steps to reproduce the issue..."
              required
              className="mt-1"
            />
            <p className="mt-2 text-sm text-gray-500">{form.description.length}/5000 characters</p>
          </div>

          {/* Screenshot */}
          <ScreenshotCapture
            screenshot={form.screenshot}
            onScreenshotCapture={(screenshot) => setForm({ ...form, screenshot })}
          />

          {/* Public/Private Toggle */}
          <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-md">
            <Checkbox
              id="is_public"
              checked={form.is_public}
              onCheckedChange={(checked) =>
                setForm({ ...form, is_public: checked as boolean })
              }
            />
            <div className="flex-1">
              <Label
                htmlFor="is_public"
                className="text-sm font-medium text-gray-900 cursor-pointer"
              >
                Post to community board
              </Label>
              <p className="text-sm text-gray-500">
                {form.is_public
                  ? 'Your feedback will be visible to other users who can vote and comment on it.'
                  : 'Your feedback will only be visible to the oppSpot team.'}
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="inline-flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Feedback
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Info Section */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <MessageCircle className="h-5 w-5 text-gray-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-800">How we handle your feedback</h3>
              <div className="mt-2 text-sm text-gray-600">
                <ul className="list-disc list-inside space-y-1">
                  <li>Public feedback appears on the community board for voting</li>
                  <li>Other users can upvote feedback they want prioritized</li>
                  <li>Your feedback is sent directly to our development team</li>
                  <li>We typically respond to feedback within 1-2 business days</li>
                  <li>Screenshots help us understand and resolve issues faster</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
