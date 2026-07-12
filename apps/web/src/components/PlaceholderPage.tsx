import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

/**
 * Shared "Coming soon" placeholder used by every not-yet-built route. Renders
 * the page name centred with a muted subtitle so the routing/layout shell can
 * be verified before the real pages land.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {description ?? 'Coming soon.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
