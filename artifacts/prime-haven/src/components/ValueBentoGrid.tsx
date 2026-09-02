import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const reasons = [
  {
    n: '01',
    title: 'You work with people, not a queue',
    body:
      "Every project gets a named lead who stays with it from the first call to launch. You'll know who to message, and you'll get an answer the same day.",
  },
  {
    n: '02',
    title: 'We only put forward work we would sign our name to',
    body:
      'Nothing reaches you until it has been reviewed internally. If a draft is not good enough, we redo it before you ever see it.',
  },
  {
    n: '03',
    title: 'The people building it have a stake in it',
    body:
      'Our designers and developers earn a share when clients accept the work — so the person doing your project actually cares how it lands.',
  },
  {
    n: '04',
    title: 'Priced for Ghana, built to global standards',
    body:
      'Local rates and honest quotes, with the craft and process you would expect from a studio anywhere in the world.',
  },
];

const ValueBentoGrid = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-32 space-y-6">
                <span className="eyebrow">Why people stay with us</span>
                <h2 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight leading-[1.05] text-foreground">
                  Four reasons clients <span className="display-italic text-primary">come back</span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We are a small team in Accra that would rather do a handful of projects properly than
                  a hundred quickly. Here is what that looks like in practice.
                </p>
                <Link
                  to="/start-project"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                >
                  Start a project <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <ul className="divide-y divide-border/60 border-y border-border/60">
                {reasons.map((r) => (
                  <li key={r.n} className="py-8 flex gap-6">
                    <span className="text-sm font-mono text-primary pt-1 shrink-0">{r.n}</span>
                    <div className="space-y-2">
                      <h3 className="text-xl font-heading font-bold text-foreground">{r.title}</h3>
                      <p className="text-muted-foreground leading-relaxed max-w-xl">{r.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValueBentoGrid;
