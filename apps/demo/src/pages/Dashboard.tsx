import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardPage() {
  const location = useLocation();
  const name = (location.state as { name?: string } | null)?.name ?? 'there';

  return (
    <Card className="w-full max-w-md" data-testid="dashboard">
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>You are signed in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p data-testid="welcome">
          Welcome, <span className="font-semibold" data-testid="profile-name">{name}</span>!
        </p>
        <Button asChild variant="outline">
          <Link to="/login">Sign out</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
