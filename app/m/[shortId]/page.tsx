import { Metadata } from 'next';
import { db } from '@/db';
import { matches } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

interface MatchPageProps {
  params: Promise<{ shortId: string }>;
}

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const { shortId } = await params;

  try {
    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.shortId, shortId))
      .limit(1);

    if (!match[0]) {
      return {
        title: 'Match Not Found',
      };
    }

    const m = match[0];
    const formattedDate = new Date(m.date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const matchUrl = `${baseUrl}/m/${shortId}`;
    const logoUrl = `${baseUrl}/wnf-logo.png`;

    return {
      title: `WNF Match - ${formattedDate}`,
      description: `${m.time} at ${m.location} - Mark your availability`,
      openGraph: {
        title: `WNF Match - ${formattedDate}`,
        description: `${m.time} at ${m.location} - Mark your availability`,
        url: matchUrl,
        images: [
          {
            url: logoUrl,
            width: 1200,
            height: 630,
            alt: 'WNF Logo',
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `WNF Match - ${formattedDate}`,
        description: `${m.time} at ${m.location} - Mark your availability`,
        images: [logoUrl],
      },
    };
  } catch (error) {
    return {
      title: 'Match Not Found',
    };
  }
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { shortId } = await params;

  try {
    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.shortId, shortId))
      .limit(1);

    if (!match[0]) {
      redirect('/join');
      return null;
    }

    // Redirect to home page (where they can mark availability)
    redirect('/');
  } catch (error) {
    redirect('/join');
    return null;
  }
}
