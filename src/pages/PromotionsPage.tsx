const PROMOS = [
  {
    id: 1,
    title: 'Welcome Bonus',
    subtitle: '1,000 FREE Points on Signup',
    description: 'New members get 1,000 bonus points (≈ CA$10) instantly credited on account creation. No deposit required.',
    tag: 'NEW USERS',
    icon: '🎁',
    color: 'from-[hsl(142,40%,10%)] to-[hsl(142,40%,7%)] border-[hsl(142,40%,20%)]',
    cta: 'Claim Now',
  },
  {
    id: 2,
    title: 'IPL Reload Bonus',
    subtitle: '10% Bonus on Every Deposit',
    description: 'During IPL 2026 season, get 10% extra points on every deposit. Minimum deposit CA$20.',
    tag: 'IPL SPECIAL',
    icon: '🏏',
    color: 'from-[hsl(43,50%,10%)] to-[hsl(43,40%,7%)] border-[hsl(43,50%,25%)]',
    cta: 'Deposit Now',
  },
  {
    id: 3,
    title: 'Refer & Earn',
    subtitle: '500 Points per Referral',
    description: 'Invite friends and earn 500 points for every friend who signs up and makes their first deposit.',
    tag: 'REFERRAL',
    icon: '👥',
    color: 'from-[hsl(213,50%,10%)] to-[hsl(213,40%,7%)] border-[hsl(213,50%,25%)]',
    cta: 'Share Link',
  },
  {
    id: 4,
    title: 'Weekend Cashback',
    subtitle: '5% Cashback on Losses',
    description: 'Lost on weekend matches? We return 5% of your net losses as bonus points every Monday morning.',
    tag: 'CASHBACK',
    icon: '💰',
    color: 'from-[hsl(270,40%,10%)] to-[hsl(270,40%,7%)] border-[hsl(270,40%,25%)]',
    cta: 'Opt In',
  },
];

export default function PromotionsPage() {
  return (
    <div className="min-h-screen px-4 md:px-6 py-6 max-w-[1000px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          🎁 PROMOTIONS
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Exclusive offers for CricketX members</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROMOS.map(promo => (
          <div key={promo.id} className={`card-glass rounded-2xl p-6 bg-gradient-to-br ${promo.color} border`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-white mb-2">
                  {promo.tag}
                </span>
                <h3 className="text-xl font-extrabold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {promo.title}
                </h3>
                <p className="text-sm font-semibold text-[hsl(var(--brand-gold))]">{promo.subtitle}</p>
              </div>
              <div className="text-4xl">{promo.icon}</div>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 leading-relaxed">{promo.description}</p>
            <button className="gold-gradient text-[hsl(var(--brand-navy))] text-sm font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
              {promo.cta}
            </button>
          </div>
        ))}
      </div>

      {/* T&C */}
      <div className="mt-8 text-xs text-[hsl(var(--muted-foreground))] text-center">
        <p>18+ only. Please bet responsibly. All promotions subject to Terms & Conditions.</p>
        <p className="mt-1">CricketX Exchange is licensed and operated from Canada. <span className="text-[hsl(var(--brand-gold))] underline cursor-pointer">View T&Cs</span></p>
      </div>
    </div>
  );
}
