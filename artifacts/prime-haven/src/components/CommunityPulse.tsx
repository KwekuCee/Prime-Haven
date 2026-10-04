import { CheckCircle2, MapPin, ShieldCheck, WalletCards } from 'lucide-react';

const TRUST_POINTS = [
    { text: 'Based in Accra, serving clients worldwide', icon: MapPin },
    { text: 'Vetted specialists across eight disciplines', icon: CheckCircle2 },
    { text: 'Client approval controls completion', icon: ShieldCheck },
    { text: 'USD pricing with live Ghana cedi conversion', icon: WalletCards },
];

const CommunityPulse = () => {
    return (
        <section className="w-full border-y border-border bg-background" aria-label="Why clients choose Prime Haven">
            <div className="container mx-auto grid grid-cols-1 divide-y divide-border px-6 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                {TRUST_POINTS.map((item) => (
                    <div key={item.text} className="flex items-center gap-3 py-5 sm:px-5 lg:min-h-24">
                        <item.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="text-xs font-semibold leading-relaxed text-foreground sm:text-sm">{item.text}</span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default CommunityPulse;
