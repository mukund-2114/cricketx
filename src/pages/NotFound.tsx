import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🏏</div>
        <h1 className="text-6xl font-extrabold text-[hsl(var(--brand-gold))] mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>404</h1>
        <p className="text-lg text-white mb-2">Page Not Found</p>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">The page you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/')} className="gold-gradient text-[hsl(var(--brand-navy))] font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
          Back to Matches
        </button>
      </div>
    </div>
  );
}
