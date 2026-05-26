import { redirect } from 'next/navigation';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  redirect('/dashboard/hira');
}
