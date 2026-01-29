import { redirect } from 'next/navigation';

export default function TimeOffRootPage() {
  // Redirect ke folder requests yang ada di dalam time-off
  redirect('/time-off/requests');
}