const CASINO_GAMES = [
  { id: 1, name: 'Lightning Roulette', category: 'Table', img: 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400&q=80', provider: 'Evolution', tag: 'LIVE' },
  { id: 2, name: 'Crazy Time', category: 'Game Show', img: 'https://images.unsplash.com/photo-1518895312237-a9e23508077d?w=400&q=80', provider: 'Evolution', tag: 'HOT' },
  { id: 3, name: 'Dream Catcher', category: 'Game Show', img: 'https://images.unsplash.com/photo-1606167668584-78701c57f13d?w=400&q=80', provider: 'Evolution', tag: 'LIVE' },
  { id: 4, name: 'Andar Bahar', category: 'Card', img: 'https://images.unsplash.com/photo-1541278107931-e006523892df?w=400&q=80', provider: 'Ezugi', tag: 'POPULAR' },
  { id: 5, name: 'Teen Patti', category: 'Card', img: 'https://images.unsplash.com/photo-1609743522471-83c84ce23e32?w=400&q=80', provider: 'Ezugi', tag: 'INDIAN' },
  { id: 6, name: 'Dragon Tiger', category: 'Table', img: 'https://images.unsplash.com/photo-1512001960021-2e5b2a2a4fb7?w=400&q=80', provider: 'Evolution', tag: 'LIVE' },
  { id: 7, name: 'Speed Baccarat', category: 'Table', img: 'https://images.unsplash.com/photo-1571459024009-59f1a6f4fa3e?w=400&q=80', provider: 'Evolution', tag: 'LIVE' },
  { id: 8, name: 'Monopoly Live', category: 'Game Show', img: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&q=80', provider: 'Evolution', tag: 'NEW' },
];

const tagColors: Record<string, string> = {
  LIVE: 'bg-[hsl(142,40%,12%)] text-[hsl(142,76%,55%)] border border-[hsl(142,40%,25%)]',
  HOT: 'bg-[hsl(20,80%,15%)] text-[hsl(20,90%,65%)] border border-[hsl(20,60%,25%)]',
  POPULAR: 'bg-[hsl(213,60%,15%)] text-[hsl(213,90%,70%)] border border-[hsl(213,60%,25%)]',
  INDIAN: 'bg-[hsl(43,50%,12%)] text-[hsl(43,90%,60%)] border border-[hsl(43,50%,25%)]',
  NEW: 'bg-[hsl(270,40%,15%)] text-[hsl(270,80%,75%)] border border-[hsl(270,40%,25%)]',
};

export default function CasinoPage() {
  return (
    <div className="min-h-screen px-4 md:px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-white mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          🎰 LIVE CASINO
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Real dealers, real tables — streamed live 24/7</p>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
        {['All Games', 'Live Tables', 'Game Shows', 'Card Games', 'Indian Classics', 'Slots'].map(cat => (
          <button key={cat}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              cat === 'All Games' ? 'gold-gradient text-[hsl(var(--brand-navy))]' : 'bg-[hsl(222,35%,12%)] text-[hsl(var(--muted-foreground))] hover:text-white'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Games grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {CASINO_GAMES.map(game => (
          <div key={game.id} className="card-glass rounded-xl overflow-hidden group cursor-pointer hover:border-[hsl(222,30%,28%)] transition-all">
            <div className="relative">
              <img src={game.img} alt={game.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,5%)] via-transparent to-transparent" />
              <div className="absolute top-2 left-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${tagColors[game.tag] || ''}`}>
                  {game.tag === 'LIVE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(142,76%,55%)] mr-1 animate-pulse"></span>}
                  {game.tag}
                </span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="gold-gradient text-[hsl(var(--brand-navy))] text-xs font-bold px-4 py-2 rounded-lg">
                  Play Now
                </button>
              </div>
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold text-white truncate">{game.name}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">{game.provider} · {game.category}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon notice */}
      <div className="mt-8 card-glass rounded-xl p-6 text-center border border-[hsl(43,40%,20%)] bg-[hsl(43,30%,7%)]">
        <div className="text-3xl mb-3">🔧</div>
        <h3 className="text-lg font-bold text-[hsl(var(--brand-gold))] mb-2">Full Casino Integration Coming Soon</h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
          Connect with Evolution Gaming, Ezugi, or Pragmatic Play APIs to enable real live casino games. Contact us to set up your game provider integration.
        </p>
      </div>
    </div>
  );
}
